# ChartDown App – SDD Plan (Spec-Driven Development)

**Version:** draft 0.2 · **Date:** October 2, 2026 · **Status:** specs approved with the decisions in sections 8 and 9; next stage: Technical Plan

This document defines **what** the application must do and **why**, before deciding **how** it is built. Architecture and stack belong to the next stage (Technical Plan), once these specifications are approved.

## 1. How we work

Every module goes through the same cycle, in this order:

1. **Constitution** (once): the principles no decision may break.
2. **Specify:** what the module does, for whom, and how we know it works (acceptance criteria).
3. **Clarify:** resolve open questions before designing.
4. **Technical plan:** architecture, data, services.
5. **Tasks:** split the plan into small, verifiable tasks.
6. **Implement and validate:** a task is done only when it meets the acceptance criteria of its spec.

**Golden rule:** nothing is built without an approved spec. If something changes, the spec changes first, then the code.

## 2. Constitution (principles)

1. **ChartDown is the core.** Every chart is stored as ChartDown text. The app never stores charts in a closed format.
2. **Open source and public by default.** The notation is CC0 and the reference code is MIT. **Public is permanent:** a published version stays available to everyone even if its author makes it private (decision 6).
3. **One structure, many readings.** The song is the same for everyone. The MD's directions live in a **band layer** on top of the version, and each musician sees their own (decision 4).
4. **The author owns their version.** Only they edit it. Everyone else uses it or forks it.
5. **Every version says where it comes from.** Two versions can share a name, but the source always tells them apart.
6. **Respect for copyright.** No full lyrics are stored; only short, optional landmarks at the start of a section. No relationship with or data from CCLI (decision 10).
7. **Ready for the stage.** Desktop and iPad first, and a downloaded set opens with no internet (decision 12).
8. **Communication and transparency.** Every musician knows when they are added to a set and when a song changes (decision 13).
9. **English first, Spanish too.** The interface is bilingual (decision 11).
10. **Simple first.** If a feature complicates a band's daily use, it waits.

## 3. Product vision

A platform where musicians and music directors write charts in ChartDown, share them in an open catalog, organize their bands and sets, and where **every musician sees the same song with their MD's directions for their instrument**, even offline on the day of the event.

## 4. Roles and permissions

**Platform roles**

| Role | Description |
|---|---|
| Visitor | No account. Can browse the public catalog but cannot create or save anything (decision 3). |
| User | Registered person. Creates songs, versions and bands. |
| Administrator | Manages users, content and the instrument catalog (decision 5). |

**Roles within a band** (the role depends on the band: you can be MD in one band and keyboardist in another, decision 1)

| Role | Description |
|---|---|
| MD | Only one per band (decision 2). Manages musicians, sets and the notes layer. |
| Temporary MD | A member the MD appoints for one specific set when the MD can't be there. Their authority ends with that set (decision 2). |
| Musician | Member with one or more assigned instruments. Sees their band's sets. |

**Permission matrix**

| Action | Visitor | User | Musician | Temporary MD | MD | Admin |
|---|---|---|---|---|---|---|
| Browse the public catalog | Yes | Yes | Yes | Yes | Yes | Yes |
| Create a song, version or fork | No | Yes | Yes | Yes | Yes | Yes |
| Edit their own version | No | Yes | Yes | Yes | Yes | Yes |
| Edit someone else's version | No | No | No | No | No | Moderate only |
| Make their version private (a public copy remains) | No | Yes | Yes | Yes | Yes | Yes |
| Create a band (and be its MD) | No | Yes | Yes | Yes | Yes | Yes |
| Invite musicians and assign instruments | No | No | No | No | Yes | No |
| Appoint a temporary MD | No | No | No | No | Yes | No |
| Create sets | No | No | No | No | Yes | No |
| Edit a set (order, keys, lineup) | No | No | No | Their set only | Yes | No |
| Write the MD notes layer | No | No | No | No (decision 9.6) | Yes | No |
| See their band's sets | No | No | Yes | Yes | Yes | No |
| See layer notes | No | No | General and their instrument | All, in their set | All | No |
| Manage the instrument catalog | No | No | No | No | No | Yes |
| Hide content, suspend users | No | No | No | No | No | Yes |

## 5. Domain model (conceptual)

| Entity | What it is | Related to |
|---|---|---|
| User | Person with an account, preferred language and instruments they play | Bands, versions, sets |
| Song | The work: title and writers (no CCLI data) | Many versions |
| Version (arrangement) | A chart in ChartDown: owner, visibility, source; may come from a fork | A song, its revisions |
| Revision | Each saved change to a version; allows going back (decision 7) | A version |
| Source | Studio, live, acoustic or own arrangement; album, year, YouTube link | A version |
| Instrument | Entry in the catalog managed by the Admin (decision 5) | Members, lineups, notes |
| Band | Group of musicians with a single MD | Members, sets, layers |
| Member | User within a band, with a role and default instruments | Band, user |
| MD layer | Notes per section and instrument that a band puts on top of a version, without touching the chart (decision 4) | Band, version |
| Set | Group of songs with a name unique within the band (decision 8), optional date and type | Band, items, lineup |
| Set item | A version at a position, with its key for that set (decision 9) | Set, version, layer |
| Set lineup | Which musician plays which instrument, and who is temporary MD | Set, members |
| Notification | Notice of a change to a person (decision 13) | User, set, version |
| Offline download | Copy of a set stored on the device (decision 12) | Set, user |

**Design decisions**

- **Song and Version are separate.** The catalog shows “Open Road: 4 versions”, each with its source.
- **The MD layer is separate from the version.** Many bands use the same public version, each with its own notes, without near-identical forks.
- **Making private does not delete what is public.** The public version stays in the catalog and the owner gets a private copy to keep editing. Other people's sets and forks are untouched (decision 6).

## 6. Module specifications

### SPEC-00 · ChartDown core

**Goal:** the notation is the single source of every chart.

**Status:** the language is at version 0.4 (syntax, parser and playground) in github.com/ChartDown/Language.

**Remaining requirements for the app**

- R-00.1 Instruments in notes use identifiers from the Admin's catalog, not a fixed list inside the parser (decision 5).
- R-00.2 **MD layer** format: notes anchored to a section of the version (by name and position) and, when needed, to a bar (decision 4).
- R-00.3 The parser returns the chart as structured data (JSON) so the app never reads raw text.
- R-00.4 The header declares the format version (`chartdown: 0.4`). The parser returns the declared version and warns when a file declares a version it does not support; a missing version is not a warning, and the app writes it into every chart it saves.
- R-00.5 Remove the `ccli` header field and its examples (decision 10). (Done in ChartDown 0.3.)
- R-00.6 Pickup bars and tempo or meter changes within a song.

**Interpretations of ChartDown 0.4** (where spec section 12 is silent; candidates for the Language repository)

- Minor keys spell chords like their relative major: Dm uses F's flats (its `b6` is Bb), Em uses G's sharps, Cm uses Eb's flats.
- Number style shows `-` for every minor quality, not only plain minor: `6m7` reads `6-7`; qualities starting with `maj` are unchanged.
- A transposed key takes its common name: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B; in minor, Cm, C#m, Dm, Ebm, Em, Fm, F#m, Gm, G#m, Am, Bbm, Bm.

**Acceptance criteria**

- Given a valid chart, the parser returns the same structure on every platform.
- Given a chart with errors, the parser does not stop and reports every warning with its line number.
- Given a layer whose section no longer exists in the version, the note is marked “unplaced” and is not lost.

### SPEC-01 · Accounts, access and language

**Goal:** secure accounts, a catalog open to visitors and a bilingual interface.

**Requirements**

- R-01.1 Sign up, sign in, sign out and account recovery.
- R-01.2 Profile with name, language and instruments played (from the catalog).
- R-01.3 Platform roles: Visitor, User and Administrator.
- R-01.4 A visitor browses and reads the public catalog. Creating, forking or saving asks them to sign in (decision 3).
- R-01.5 Interface in English by default, with an option to switch to Spanish. The preference is stored in the profile (decision 11).
- R-01.6 A person can delete their account. Their public versions stay with the community and are credited to “ChartDown”, and their personal data is deleted (decision 9.5, updated in Technical Plan 12.5).
- R-01.7 During the beta, creating an account requires a valid invite code. The Admin creates and revokes single-use or whole-band codes.
- R-01.8 Without a code, a person can leave their email on a waitlist. The public catalog stays visible to visitors.

**Acceptance criteria**

- Given a visitor, when they open a public version, then they read it in full; when they tap “Fork”, then they are asked to sign in.
- Given a user who chooses Spanish, when they use the app, then the whole interface is in Spanish and the ChartDown syntax does not change.
- Given a regular user, when they try to open the admin panel, then access is denied.

### SPEC-02 · Catalog, versions and history

**Goal:** an open catalog where every version is identified by its source and nothing public is lost.

**Requirements**

- R-02.1 Create a song or pick an existing one, and create a version of it.
- R-02.2 The source is required: type, and optionally album, year and YouTube link.
- R-02.3 Versions are public by default.
- R-02.4 **Making a public version private** creates a private copy for the owner. The public one stays in the catalog under the author's name, marked “frozen public version” (decision 9.4), and the sets and forks that use it are not affected (decision 6).
- R-02.5 A private version never appears in the catalog or in search.
- R-02.6 Only the owner edits their version. Others view it, use it in their sets or fork it.
- R-02.7 A fork copies the chart and keeps a reference to the original version and its author. The MD layer does not travel with the fork.
- R-02.8 **History:** every save creates a revision. The owner sees the revisions and can go back to an earlier one; going back is also recorded (decision 7).
- R-02.9 Duplicates are allowed. The catalog shows how many versions each song has.
- R-02.10 Search by title, artist and source.

**Acceptance criteria**

- Given a public version by user A, when user B opens it, then B sees the chart and “Fork”, but not “Edit”.
- Given a public version by A that B uses in a set, when A makes it private, then B's set still opens the public version and A has a private copy they can edit.
- Given a version with five revisions, when the owner goes back to the third, then the chart shows that content and the history records the restore as a new revision.

### SPEC-03 · Chart editor and viewer

**Goal:** write and read charts comfortably on desktop and iPad.

**Requirements**

- R-03.1 ChartDown text editor with live preview and error warnings.
- R-03.2 Switch between numbers and letters, and transpose.
- R-03.3 Stand mode: full screen, large type, advance by section with one tap.
- R-03.4 Print or export to PDF.
- R-03.5 **MD layer editor:** the MD writes notes per section and instrument on top of the version, without being able to change the chart.

**Acceptance criteria**

- Given a chart open on an iPad in landscape, when stand mode is on, then every section reads without zooming.
- Given an MD with someone else's public version, when they add a note for bass in the Chorus, then the note is saved in their band's layer and the public version does not change.

### SPEC-04 · Bands

**Goal:** the MD builds their band and assigns instruments.

**Requirements**

- R-04.1 Any user can create a band and becomes its only MD (decision 2).
- R-04.2 The MD invites musicians and they accept the invitation.
- R-04.3 Each member has one or more default instruments, from the catalog.
- R-04.4 The MD can remove members. A musician can leave the band.
- R-04.5 A user can belong to several bands, with a different role in each (decision 1).
- R-04.6 Proposal: the MD can permanently transfer the MD role to another member.
- R-04.7 **Personal space:** every user automatically has a one-person band, private and without invitations, where they are the MD. There they can add their own notes layer on top of any public version without forking, and build their own sets with dates and keys. When they form a real band, they can copy those notes into the new band's layer.

**Acceptance criteria**

- Given a band with an MD, when someone tries to appoint a second permanent MD, then the system refuses and offers “Temporary MD” for a set.
- Given a musician who left the band, when they try to open one of that band's sets, then they no longer have access.

### SPEC-05 · Sets and events

**Goal:** organize what is played, when and with whom.

**Requirements**

- R-05.1 The MD creates a set with a name unique within their band (decision 8), an optional date and a type (rehearsal, service, concert).
- R-05.2 Adds versions to the set and orders them. Each song is pinned to the revision it was added with. If the author publishes a new revision, the MD gets a notice with “Update” and decides; this way an author's change never affects other MDs in the community (decision 9.2).
- R-05.3 Defines the lineup: which musician plays which instrument, one or several. By default the band's are used.
- R-05.4 **Key per song in the set.** It does not change the version or affect other users (decision 9).
- R-05.5 **Temporary MD:** the MD appoints a member as MD for one set. They can edit that set (order, keys, lineup) and nothing else, without writing in the notes layer (decision 9.6), and the role ends when the MD removes it or the set's date passes (decision 2).
- R-05.6 List of upcoming and past sets. Duplicate an existing set.

**Acceptance criteria**

- Given an MD, when they create a set with a name that already exists in their band, then the system asks for another name.
- Given a set in the key of A for a version written in G, when another user opens that version, then they see it in G.
- Given the temporary MD of the set “Sunday 12”, when they try to edit the set “Sunday 19”, then they don't have permission.

### SPEC-06 · Per-instrument view

**Goal:** the core feature. Every musician sees the same song with their MD's notes for their instrument.

**Requirements**

- R-06.1 When a musician opens a song from a set, the app uses their instrument in that set's lineup.
- R-06.2 They see the full structure, the layer's general notes and their instrument's notes. They don't see other instruments' notes.
- R-06.3 The MD, and the temporary MD in their set, see all notes and can switch the view (“view as bass”).
- R-06.4 **The layer is private to the band.** Only its members see it, and each musician receives only their notes: the filter is applied on the server, not only on screen.
- R-06.5 Outside a set, in the catalog, the version is shown without any layer, in its “Everyone” view.
- R-06.6 There is one layer per band and version, reused in all of the band's sets (decision 9.1). The band's layer rules: each MD writes their own notes for each version. Notes the author left in the public version are shown separately and the MD can hide them (decision 9.3).

**Acceptance criteria**

- Given a set where Ana plays keys, when she opens a song with notes for keys and for bass, then she sees the keys notes and the general notes, and her device never receives the bass notes.
- Given a user who is not in the band, when they open the same public version, then they see none of that band's layer notes.
- Given a musician with two instruments in the lineup, when they open the song, then they see the notes for both.

### SPEC-07 · Administration

**Goal:** keep the platform healthy.

**Requirements**

- R-07.1 User panel: search, suspend, reactivate.
- R-07.2 Reports on public content (for example, a version with full lyrics) and the option to hide it.
- R-07.3 **Instrument catalog:** a starting list the Admin extends, renames or deactivates. An instrument in use is never deleted, only deactivated (decision 5).
- R-07.4 Basic metrics: users, versions, bands, sets.

**Acceptance criteria**

- Given a reported version, when the Admin hides it, then it disappears from the catalog and its owner receives a notice.
- Given a deactivated instrument, when an MD builds a new lineup, then it is not in the list, but earlier lineups keep it.

### SPEC-08 · Offline

**Goal:** nothing fails on the day of the event (decision 12).

**Requirements**

- R-08.1 A musician downloads a complete set to their device: charts, the set's keys, their lineup and their notes.
- R-08.2 The downloaded set opens and reads with no internet, including stand mode.
- R-08.3 When the connection returns, the app updates the set and shows what changed.
- R-08.4 Offline is read-only; editing requires a connection (decision 9.8).

**Acceptance criteria**

- Given a downloaded set, when the iPad is in airplane mode, then every song in the set opens with the notes for that musician's instrument.
- Given a change to the set while the musician was offline, when the connection returns, then they see a notice with the change.

### SPEC-09 · Notifications

**Goal:** communication and transparency within the band (decision 13).

**Requirements**

- R-09.1 Notify a musician when they are added to a set, their instrument in a set changes, or they are appointed temporary MD.
- R-09.2 Notify when a song in one of their sets changes: new revision, new note for their instrument, key or order change.
- R-09.3 Every notice says what changed, not just that something changed.
- R-09.4 Notify the MD when a version used in their sets has a new revision from its author.
- R-09.5 Each user chooses which notices they receive. Channels: in-app in the MVP, email in phase 2 and WhatsApp in phase 3 (decision 9.7).

**Acceptance criteria**

- Given a set with a date, when the MD adds Luis as bassist, then Luis receives a notice with the set's name and date.
- Given a key change on a song in the set, when a musician opens their notice, then they see the song, the old key and the new one.

## 7. Phases

| Phase | Includes | Outcome |
|---|---|---|
| 0 | Constitution, specs and decisions | Specs approved (done) |
| 1 (MVP) | SPEC-00 (R-00.1 to R-00.5), 01, 02, 03 with layer editor, 04, 05 with key per set and temporary MD, 06, 08 offline reading, 09 in-app notices | A real band prepares a set, each musician reads their notes and plays without depending on the internet |
| 2 | Advanced stand mode, PDF, invite links, email notices, revision comparison, advanced search | Comfortable use in rehearsal and on stage |
| 3 | Full administration and reports, WhatsApp notices, offline editing, phone app | Platform open to the public |

## 8. Decisions from the Clarify phase

The product owner's answers of October 2. The specs cite each one by number (for example, “decision 4”).

1. Is the MD role per band or global? **Per band**, because the same person can be MD in band 1 and keyboardist in band 2.
2. Can a band have more than one MD? **No, only one MD**, so there is a single direction. If the MD can't make it, they can appoint another band member as temporary MD for that event only.
3. Can people without an account see the public catalog? **Yes, it is public.** They can browse the catalog but cannot create anything; only users can create.
4. MD notes: option A (inside the version, forking to customize) or option B (a band layer on top of a public version, no fork)? **Option B**: a notes layer on top of the published version.
5. Which instruments? Fixed list or configurable per band? **A starting list, kept in a catalog managed by the Admin.**
6. If the owner makes private or deletes a public version others use in their sets, what happens? **Those sets keep working.** If a public version is in other people's sets and its author makes it private, two versions exist from that moment: the private one belongs to the author, and the public one stays public domain. Forks are not affected because they are copies of the original.
7. Do we keep a change history for each version? **Yes**, so the user can go back to an earlier version.
8. Is the set name unique within the band or across the platform? **Only within the band**, since each band names its own sets.
9. Key per song within a set? **Yes.** In a set, the MD sets the keys without affecting other users who use that public version; for a private version it only affects that set's members.
10. Lyrics: only short landmarks? **Yes, only short, optional landmarks** showing how a section's lyric starts. Relationship with CCLI? **None**; CCLI must not appear in ChartDown.
11. Interface language? **English first, with an option to switch to Spanish**; both must be supported.
12. Must it work without internet during the event? **Yes.** Users must be able to download a set so their charts open with no internet.
13. Do we notify musicians when they are added to a set or a song changes? **Yes.** Users must know when they are added and when a song changes; communication and transparency are the most powerful part of this product.

## 9. Decisions from the second round

These came out of the decisions above and were all resolved. The specs cite them as “decision 9.1”, “decision 9.2”, and so on.

1. **Scope of the MD layer:** one layer per band and version, reused in every set; the set only adjusts key and lineup. **Approved.**
2. **New revisions from the author:** sets stay pinned and the MD gets a notice with an “Update” button. **Approved**, so other MDs in the community who use that version are never affected.
3. **Author's notes plus the layer:** the band's layer rules; the author's notes are shown separately and the MD can hide them. **Approved**, and the MD can write their own notes; that is the point of the layer: every MD can add notes for each version.
4. **Frozen public copy:** when the owner makes their version private, the public copy keeps their name as author, marked “frozen public version”. **Approved**, because they wrote the chart.
5. **Deleted account:** the original answer was to keep showing the person as author. **Superseded by Technical Plan 12.5:** when an account is deleted, its public versions are credited to “ChartDown” and no personal data remains.
6. **Temporary MD powers:** only their set (order, keys, lineup), not the shared notes layer. **Approved**, because the role is temporary for that set.
7. **Notification channels:** in-app in the MVP, email in phase 2, **and WhatsApp in phase 3.**
8. **Offline:** **read-only.**

## 10. Out of scope for now

- Architecture, database and stack (they belong to the Technical Plan).
- Phone app.
- Audio playback or YouTube sync.
- Payments or subscriptions.

## 11. Next step

The specs are approved. The next stage is the Technical Plan: architecture, data model, authentication, offline sync and notifications.
