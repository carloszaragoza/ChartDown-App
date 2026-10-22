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
7. **Ready for the stage.** Desktop and iPad first; every page also works on a phone (R-03.8, R-03.9); a downloaded set opens with no internet (decision 12).
8. **Communication and transparency.** Every musician knows when they are added to a set and when a song changes (decision 13).
9. **English first, Spanish too.** The interface is bilingual (decision 11).
10. **Simple first.** If a feature complicates a band's daily use, it waits.

## 3. Product vision

A platform where musicians and music directors write charts in ChartDown, share them in an open catalog, organize their bands and sets, and where **every musician sees the same song with their MD's directions for their instrument**, even offline on the day of the event.

## 4. Roles and permissions

**Platform roles**

| Role          | Description                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| Visitor       | No account. Can browse the public catalog but cannot create or save anything (decision 3). |
| User          | Registered person. Creates songs, versions and bands.                                      |
| Administrator | Manages users, content and the instrument catalog (decision 5).                            |

**Roles within a band** (the role depends on the band: you can be MD in one band and keyboardist in another, decision 1)

| Role         | Description                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| MD           | Only one per band (decision 2). Manages musicians, sets and the notes layer.                                               |
| Temporary MD | A member the MD appoints for one specific set when the MD can't be there. Their authority ends with that set (decision 2). |
| Musician     | Member with one or more assigned instruments. Sees their band's sets.                                                      |

**Permission matrix**

| Action                                             | Visitor | User | Musician                     | Temporary MD      | MD  | Admin         |
| -------------------------------------------------- | ------- | ---- | ---------------------------- | ----------------- | --- | ------------- |
| Browse the public catalog                          | Yes     | Yes  | Yes                          | Yes               | Yes | Yes           |
| Create a song, version or fork                     | No      | Yes  | Yes                          | Yes               | Yes | Yes           |
| Edit their own version                             | No      | Yes  | Yes                          | Yes               | Yes | Yes           |
| Edit someone else's version                        | No      | No   | No                           | No                | No  | Moderate only |
| Make their version private (a public copy remains) | No      | Yes  | Yes                          | Yes               | Yes | Yes           |
| Create a band (and be its MD)                      | No      | Yes  | Yes                          | Yes               | Yes | Yes           |
| Invite musicians and assign instruments            | No      | No   | No                           | No                | Yes | No            |
| Appoint a temporary MD                             | No      | No   | No                           | No                | Yes | No            |
| Create sets                                        | No      | No   | No                           | No                | Yes | No            |
| Edit a set (order, keys, lineup)                   | No      | No   | No                           | Their set only    | Yes | No            |
| Write the MD notes layer                           | No      | No   | No                           | No (decision 9.6) | Yes | No            |
| See their band's sets                              | No      | No   | Yes                          | Yes               | Yes | No            |
| See layer notes                                    | No      | No   | General and their instrument | All, in their set | All | No            |
| Manage the instrument catalog                      | No      | No   | No                           | No                | No  | Yes           |
| Hide content, suspend users                        | No      | No   | No                           | No                | No  | Yes           |

## 5. Domain model (conceptual)

| Entity                | What it is                                                                                                     | Related to              |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------- |
| User                  | Person with an account, preferred language and instruments they play                                           | Bands, versions, sets   |
| Song                  | The work: title and writers (no CCLI data)                                                                     | Many versions           |
| Version (arrangement) | A chart in ChartDown: owner, visibility, source; may come from a fork                                          | A song, its revisions   |
| Revision              | Each saved change to a version; allows going back (decision 7)                                                 | A version               |
| Source                | Studio, live, acoustic or own arrangement; album, year, YouTube link                                           | A version               |
| Instrument            | Entry in the catalog managed by the Admin (decision 5)                                                         | Members, lineups, notes |
| Band                  | Group of musicians with a single MD                                                                            | Members, sets, layers   |
| Member                | User within a band, with a role and default instruments                                                        | Band, user              |
| MD layer              | Notes per section and instrument that a band puts on top of a version, without touching the chart (decision 4) | Band, version           |
| Set                   | Group of songs with a name unique within the band (decision 8), optional date and type                         | Band, items, lineup     |
| Set item              | A version at a position, with its key for that set (decision 9)                                                | Set, version, layer     |
| Set lineup            | Which musician plays which instrument, and who is temporary MD                                                 | Set, members            |
| Notification          | Notice of a change to a person (decision 13)                                                                   | User, set, version      |
| Offline download      | Copy of a set stored on the device (decision 12)                                                               | Set, user               |

**Design decisions**

- **Song and Version are separate.** The catalog shows “Open Road: 4 versions”, each with its source.
- **The MD layer is separate from the version.** Many bands use the same public version, each with its own notes, without near-identical forks.
- **Making private does not delete what is public.** The public version stays in the catalog and the owner gets a private copy to keep editing. Other people's sets and forks are untouched (decision 6).

## 6. Module specifications

### SPEC-00 · ChartDown core

**Goal:** the notation is the single source of every chart.

**Status:** the language is at version 0.6 (syntax, spec, playground and, since October 13, 2026, its official conformance suite, Appendix B) in the public repository github.com/ChartDown/spec (the older ChartDown/Language is private); 0.7 (chord quality vocabulary, `numbering: 6m`, formal grammar; 142 cases) was merged there on October 13, 2026 (pull request 2, commit `1e103c9`), and the owner wants the app on 0.7 too (E20); the `chartdown` parser in this repository moves from 0.4 to 0.6 (owner's decision, October 8, 2026, so the beta runs the latest published version).

**Remaining requirements for the app**

- R-00.1 Instruments in notes use identifiers from the Admin's catalog, not a fixed list inside the parser (decision 5).
- R-00.2 **MD layer** format: notes anchored to a section of the version (by name and position) and, when needed, to a bar (decision 4).
- R-00.3 The parser returns the chart as structured data (JSON) so the app never reads raw text.
- R-00.4 The header declares the format version (`chartdown: 0.8`; 0.7 until E23, 0.6 until E20). The parser returns the declared version and warns when a file declares a version it does not support (it reads 0.3 to 0.8, and charts written for earlier versions parse the same); a missing version is not a warning, and the app writes the current version into every chart it saves.
- R-00.5 Remove the `ccli` header field and its examples (decision 10). (Done in ChartDown 0.3.)
- R-00.6 Pickup bars (`[p:N]`), meter changes (`@meter`, `[m:N/D]`), tempo changes (`@tempo`) and tempo marks (`{rit}`, `{accel}`, `{a tempo}`) within a song (ChartDown 0.5 and 0.6).
- R-00.7 Unison riffs (`R[ ... ]`), partial rests (`x:beats`) with the tokens of a bar sharing what is left of it, and the sixteenth-note push (`''`) (ChartDown 0.5).
- R-00.8 Cues and MD notes for one pass of a repeat (`{2x drums: in}`, `> MD 2x bass: ...`), and repeat counts written `:| 3x` or `:| x3` (ChartDown 0.6). A note for one pass stays private to its instruments like any other MD note.
- R-00.9 Navigation marks (`{segno}`, `{coda}`, `{to coda}`, `{fine}`, D.S. and D.C. jumps), warnings for an incomplete jump, and the play order of a chart after repeats, endings and navigation (ChartDown 0.6).
- R-00.10 The JSON form of a parsed chart (ChartDown 0.6, Appendix A), with its play order and warnings, so other apps and tests agree on what a chart means. The `chartdown` npm package exports it.
- R-00.11 The app draws every element of ChartDown 0.6 in the viewer, the editors and stand mode, in numbers and in letters; the per-instrument view hides the cues and notes meant for other instruments.
- R-00.13 **Chord qualities (ChartDown 0.7, spec 6):** aliases take their canonical form (`min`, `mi` and a leading `-` are `m`; `ø` is `m7b5`; `°7` is `dim7`, `°` is `dim`; `+` is `aug`; `Δ` is `maj7`, and `Δ`, `M` or `ma` before a digit are `maj`; `sus4` is `sus`; parentheses are dropped), and a quality in the spec's vocabulary is kept in its canonical spelling, in the JSON form too; a quality outside it passes through as written, with no warning. Number style shows `-` for every canonical minor quality (`m7b5` reads `-7b5`).
- R-00.14 **Numbering from the relative major (ChartDown 0.7, spec 3 and 12):** the `numbering` header field (`1m` by default, or `6m`; any other value is a warning on that line and `1m` is used). With `6m`, a number in a minor row (the home key or an `@key` in minor) counts from the relative major: in Em, `6m` is Em and `1` is G; major rows do not change, and letters shown as numbers in such a row count from the relative major too.
- R-00.15 **JSON form 0.7 (Appendix A):** a top-level `numbering` (`1m` or `6m`), `minor` on every row, and `quality` in its canonical form; `degree` stays the semitones from the tonic whatever the numbering.
- R-00.16 **Grammar (ChartDown 0.7, spec 15):** directive names are read in any case (`@KEY D` is `@key D`), and an `@key` value the parser cannot read is a warning on its line.
- R-00.17 **A section reused with a count (ChartDown 0.8, spec 5.2):** `@use Name 3x` (or `x3`) plays the copied rows that many times in a row, each time as written (its own repeats, endings and one-pass cues start over); after a D.S. or D.C. jump it plays once; `0x` is read as `1x` with a warning; a note for one pass needs no repeat in a counted copy; the JSON form gives `sections[].times`. The app draws the count with the section (`×3` in its heading and the song form) and the metronome plays it (owner's approval, October 15, 2026).
- R-00.18 **A tempo's beat unit (ChartDown 0.9, spec 11.3):** `tempo: 58 q.` and `@tempo 87 q` name what one beat is (`h`, `h.`, `q`, `q.`, `e`, `e.`, `s`), `?` says the number is known but not what it counts, and a tempo can have decimals. Without a unit, 6/8, 9/8 and 12/8 count the dotted quarter note and every other meter its bottom number; an unwritten unit follows `@meter`, a written one stays. A unit it can't read is a warning, and the meter's beat counts. Rows give the unit written and whether it is unconfirmed; the parser gives what a row's tempo counts and the tempo in eighth notes per minute; the JSON form gives `rows[].tempoUnit` and `rows[].tempoEpm`.
- R-00.12 **Conformance:** `chartdown` passes the official ChartDown conformance suite (spec Appendix B, `conformance/` in github.com/ChartDown/spec) at a pinned commit, through the suite's own runner, and ships the adapter that lets anyone run the suite against it. The suite is the definition of compatible; matching the playground is no longer the test.

**Rules that were this app's interpretations and are now spec text** (ChartDown 0.6 clarifications, github.com/ChartDown/spec PR 1, October 13, 2026; the parser already met each one, checked against the suite that day)

- Meter and tempo, like the key, stay in effect across sections until the next `@meter` or `@tempo` (spec 11.2, 11.3).
- `@use` copies the rows of the earlier section with their meter and tempo; only the key is the current one. A section with `@use` and its own rows keeps its rows, with a warning; `@use` of a missing section is a warning (spec 5.2).
- A header with no closing `---` ends at the first `##` line, with a warning on line 1; an unknown `chartdown` version is a warning on its line and the file is still read; a file with no `chartdown` line is read as the latest version the parser knows (spec 3, R-00.4).
- An unknown name in a cue is a warning, and the whole text becomes a cue for everyone; the JSON form names roles by the spec's Role column (`everyone`, `guitar`, `vocals`, `saxophone`…), custom roles by their id (spec 4.1).
- Number style shows `-` for every minor quality (`6m7` reads `6-7`); qualities starting with `maj` are not minor (spec 12.4). Minor keys spell chords like their relative major (spec 12.5). A transposed key takes its common name: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B; in minor, Cm, C#m, Dm, Ebm, Em, Fm, F#m, Gm, G#m, Am, Bbm, Bm (spec 12.6).
- A warning carries its line (0 only when none applies); their order and wording are each parser's (spec 13).

**Still this app's interpretation**

- A layer's bar numbers are the chart's: a pickup is bar 0 and the first full bar is bar 1 (spec 5.3).

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
- R-01.5 Interface in English by default, with an option to switch to Spanish. A first-time visitor sees the language of their browser when it is Spanish, and English otherwise (owner's review, October 8, 2026). The preference is stored in the profile (decision 11); a signed-in person changes it only there, and a visitor with the small EN | ES at the foot of the landing page.
- R-01.6 A person can delete their account. Their public versions stay with the community and are credited to “ChartDown”, and their personal data is deleted (decision 9.5, updated in Technical Plan 12.5).
- R-01.7 During the beta, creating an account requires a valid invite code. The Admin creates and revokes single-use or whole-band codes.
- R-01.8 Without a code, a person can leave their email on a waitlist, with their role (music director, musician or teacher) when they give it. The public catalog stays visible to visitors.
- R-01.9 A person whose confirmation email did not arrive asks for it again, from the screen that tells them to check their email and from Sign in when it refuses an unconfirmed account. The answer is the same whether or not the email has an account waiting, so nobody learns which emails exist; asking too often says to wait a moment (owner's beta, October 14, 2026: two people never saw their email).

**Acceptance criteria**

- Given a visitor, when they open a public version, then they read it in full; when they tap “Fork”, then they are asked to sign in.
- Given a user who chooses Spanish, when they use the app, then the whole interface is in Spanish and the ChartDown syntax does not change.
- Given a regular user, when they try to open the admin panel, then access is denied.
- Given a person who signed up and did not get the confirmation email, when they ask for it again, then a new one is sent and the screen says to check their inbox and their spam folder.

### SPEC-02 · Catalog, versions and history

**Goal:** an open catalog where every version is identified by its source and nothing public is lost.

**Requirements**

- R-02.1 Create a song or pick an existing one, and create a version of it. A new version of an existing song starts from a chart of it: the version the person came from, or else the song's most recently updated public version, never a blank example (owner's review, October 16, 2026).
- R-02.2 The source is required: type, and optionally album, year and YouTube link. The version's owner can change its source later, in the editor, with the same rules; the song's title and artists are the song's and stay as they are, and a change of source is no new revision (owner's review, October 16, 2026).
- R-02.3 Versions are public by default.
- R-02.4 **Making a public version private** creates a private copy for the owner. The public one stays in the catalog under the author's name, marked “frozen public version” (decision 9.4), and the sets and forks that use it are not affected (decision 6).
- R-02.5 A private version never appears in the catalog or in search.
- R-02.6 Only the owner edits their version. Others view it, use it in their sets or fork it.
- R-02.7 A fork copies the chart and keeps a reference to the original version and its author. The MD layer does not travel with the fork.
- R-02.8 **History:** every save creates a revision. The owner sees the revisions and can go back to an earlier one; going back is also recorded (decision 7).
- R-02.9 Duplicates are allowed. The catalog shows how many versions each song has.
- R-02.10 Search by title, artist and source. A whole row is a tap target, not only its name; coming back from a version to the catalog finds the catalog as it was (the search, the source, the page and the open song), with that song in view (owner's review, October 16, 2026).
- R-02.11 **Credit in numbers:** the author of a public version (active or frozen) sees how many bands and how many musicians have it in a set, over the last 7 days, the last 30 days or all time. **Totals only:** never which bands, sets or people, never anything of a band's notes, and never for anyone but the author. Private versions are not counted. It is the community's thanks to those who share their arrangements, and the Terms and Privacy Notice say so.

**Acceptance criteria**

- Given a public version by user A, when user B opens it, then B sees the chart and “Fork”, but not “Edit”.
- Given a public version by A that B uses in a set, when A makes it private, then B's set still opens the public version and A has a private copy they can edit.
- Given a version with five revisions, when the owner goes back to the third, then the chart shows that content and the history records the restore as a new revision.
- Given A's public version in sets of two bands with three and two members, when A opens Home, then A sees 2 bands and 5 musicians and nothing that names those bands, their sets or their members; when B, who is not the author, asks for those numbers, B gets nothing.

### SPEC-03 · Chart editor and viewer

**Goal:** write and read charts comfortably on desktop and iPad, and read them on a phone.

**Requirements**

- R-03.1 ChartDown text editor with live preview and error warnings. A line with a warning, or one an import asks to check (R-10.8), is marked where it is: a band across that line with its number inside the band, at its right end; other lines show no number, so the editor doesn't read like code. Choosing a warning or a line in the import's review selects that line (owner's reviews, October 15 and 16, 2026).
- R-03.2 Switch between numbers and letters, and transpose.
- R-03.3 Stand mode: full screen, large type, advance by section with one tap; since v2 it shows the coming sections too (R-03.12). On a touch screen (iPad or phone), swiping the chart left or right also moves to the next or previous section (owner's request, October 14, 2026).
- R-03.4 Print or export to PDF.
- R-03.5 **MD layer editor:** the MD writes notes per section and instrument on top of the version, without being able to change the chart.
- R-03.6 **A note for one pass:** in the MD layer editor the MD can say that a note is only for some passes of a repeat (for example the second), and the note says so wherever it is shown (owner's approval, October 8, 2026). It is private to its instruments like any other note (R-06.4).
- R-03.7 **Beat marks, shown as the reader chooses:** the viewer, stand mode and a set's song have a Beats control with Off, Auto and Always (Auto by default: marks only in the bars where they tell something). It is a way of viewing the chart, like numbers or letters, and changes nothing in the chart text, its beat checks or its JSON form (owner's request, October 8, 2026).
- R-03.12 **Stand mode shows what comes next (v2):** stand mode shows the section being played and every section after it, stacked from top to bottom like a teleprompter, each with its title, length, notes for the reader (filtered as R-06.4 says) and bars; the sections already played sit above it, dimmed, and can be scrolled back to. The section at the top of the stack (the active zone) is the one being played and is marked **Now**. Every section keeps the same size whether it is current or not: the current one is shown by its color, its frame and the Now tag, never by a size change, so nothing moves while the reader scrolls. A scroll that settles makes the section nearest the top the current one; Next, Back, the song form, a tap on a section, the arrow and page keys and a page-turner pedal bring the chosen section to the top with a short motion (Calm by default, or Soft bounce), instantly with reduced motion. On the last section Next becomes Next song in a set, and goes back to the first section otherwise. While the metronome plays the stack follows it: a count-in says Count-in on the Now tag, the current section says which bar is playing ("Bar 3 of 8"), the stack brings each section to the top as it starts sounding, and the metronome stops after the last one; choosing a section while it plays still queues it (R-11.15), and the stack then shows the queued section right after the current one, followed by what plays after it, so what comes next on screen is what the band will play (owner's review, October 20, 2026); a scroll with the finger only looks, without changing what sounds. View sets how many sections follow the current one (1, 2 or as many as fit), the motion, Light or Stage, and the number size (Small, Medium, Large); the device remembers these choices, and stand mode asks for full screen when it opens where the browser allows it, except on a touch screen, where the browser draws its own close button over the page (Safari on an iPad) and an installed app is already full screen: there Full screen in View asks for it, and the top bar moves down below the browser's button while it is on (owner's review, October 21, 2026). The same on an iPad in both orientations, on a desktop and on a phone (owner's handoff and decisions, October 20, 2026, `design/stand-mode-v2/`). **Whole song** (owner's request and review, October 21, 2026): two fingers closing on the sections show the whole song, kept on the device, and opening go back to one section at a time, the default; there is no choice for it in View. The whole song shows every section once, in the order written, on one screen, for musicians who would rather read the song as one sheet than move from section to section. The sections flow in as many columns as fit, each whole in its column, none dimmed, the current one framed and marked Now; on an iPad or a desktop the numbers shrink from the chosen size, step by step, until the song fits, never below 60 % of it, and past that the song scrolls; a phone keeps the chosen size and each row on one line, and scrolls. A tap on a section makes it current (or queues it while the metronome plays), and Next, Back, the pedal and the metronome move the frame without moving the page, only bringing the current section into view when it is out of it. The pinch replaces the browser's zoom on the sections. Number size has an Extra small step under Small (T-2824).
- R-03.8 **Reading on a phone:** a song opened from a shared link (the version page, its stand mode and a set's song in stand mode, with the view, beats and theme the link carries) reads on a phone from 375 to 440 CSS px wide, in portrait and landscape. The chart comes first: the controls fit in one compact bar, the song form is one strip that scrolls inside itself, bar rows wrap to fit the width instead of scrolling sideways, and the page never scrolls sideways. (Owner's request, October 14, 2026: people share links and always have a phone with them, not always an iPad.)
- R-03.9 **The whole app on a phone:** every signed-in page (Home, Sets, a set and its songs, Edit set, Bands and a band, Catalog, Your versions, a version and its history, the chart editor, the director's notes, Notices, Profile and Administration) works on a phone from 360 to 440 CSS px wide, iPhone and Android alike, in portrait: one column, nothing scrolls sideways, nothing a person needs is cut short with "…", and touch targets are smaller than on an iPad so the screen holds more than buttons: 32 px, and 40 px for stand mode's section and turn buttons; the icons, the page title and the chart's numbers are a size smaller too (owner's reviews, October 15 and October 21, 2026: about a fifth smaller than before). A side panel (Home's band, a set's lineup, the notes editor's sections) goes below the page's main content; a choice among more than three options or with long names (View as, the catalog's source) becomes a menu; a row with several actions keeps its title on its own line with the actions under it (owner's request, October 15, 2026: musicians use the app on their phones too, before the beta opens to everyone).
- R-03.10 **A first chart is easy to start:** a new version doesn't open on a blank editor: it offers to import a chord sheet (SPEC-10) or to start from a short template (a title, a key, two sections and a line of chords), and says that chords can be written as numbers or as letters (`1 | 4 5 | 6m` or `G | C D | Em`). The template is an original example, never a published song (the first playground tester's feedback, October 15, 2026: a blank editor reads like code).
- R-03.11 **Listen while you read or write:** a version's YouTube link opens a mini player docked at the bottom of the version page, the chart editor and New version, small (YouTube's minimum, 200 px) and closable, with a bar above it showing the song's sections in the order the chart plays them; the bar's mark follows the video, and tapping a section takes the video there. While the video plays, the chart on the page follows it as it follows the metronome: the bar being played is marked and kept in view. Where each section falls comes from the chart's tempo, meter and bars, counted from where the music starts in the video, which the reader adjusts on screen and the version's owner can save for everyone. A chart with no tempo shows the video and asks for one to place the sections. The video's own sound is never read: YouTube doesn't allow it. Its waveform under the sections is an illustration drawn from the chart, never the recording, only to give the idea of the song's shape (owner's request, October 22, 2026, T-2829): each bar as loud as the chart's dynamics say (pp to ff, growing with cresc and fading with decresc), or as its kind of section suggests where there are none (an intro soft, a chorus loud), with a texture that looks like sound and is the same every time; it is not read by screen readers. With no connection the player is not offered (owner's review, October 16, 2026). The open player never hides the chart: the page keeps room below the chart's end (in stand mode, above Previous and Next) as tall as the player, so the last sections can be read above it, and the bar being followed is kept in view above it. The sections bar is easy to read: each section is named as in the song form (V1, C2, B1²), in a larger, bold type, and the full name of the section playing is written above the bar (owner's review, October 20, 2026). The player has its own volume control, a speaker button that opens a slider, since YouTube's own is hard to drag in so small a player (owner's review, October 21, 2026). **The player as a bar across the bottom** (owner's sketch, October 22, 2026): the player spans the bottom of the page's content, beside the side navigation (the whole width in stand mode and on a phone); every control (where the music starts, the time, Open on YouTube, Close) sits in one row along its top, and under it the sections fill most of it as cells as tall as the video, each as wide as it lasts, with a waveform across their lower part, with the section's full name small at the top (Verse 2) and its song-form name large under it (V2), the one playing in the selection color with a line inside it that fills as it plays; then a vertical volume slider, always in view; then the video. On a phone, and wherever the sections don't fit beside the video (an iPad held upright), the video goes above the cells, which then take the whole width, with the volume beside them. The band's audio player (R-06.7) is the same bar, with a large Play or Pause in the video's place and the recording's real waveform across the cells; where the browser doesn't let a page set a recording's volume (Safari on an iPad or an iPhone), its slider is not shown and the device's buttons set it.

**Acceptance criteria**

- Given a chart open on an iPad in landscape, when stand mode is on, then every section reads without zooming.
- Given an iPhone 16 in portrait (393 × 852), when a shared stand mode link opens, then the current section's name and its first row of bars are on screen without scrolling, every chord reads without zooming, and the page does not scroll sideways.
- Given an iPhone 16 in landscape (852 × 393), when stand mode is open, then the current section's bars fill most of the screen, not the controls.
- Given an iPad or a phone in stand mode, when the musician swipes the chart to the left or taps Next, then the next section shows; swiping to the right shows the previous one.
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

- R-05.1 The MD creates a set with a name unique within their band (decision 8), an optional date and time and a type (rehearsal, service, concert).
- R-05.2 Adds versions to the set and orders them. Each song is pinned to the revision it was added with. If the author publishes a new revision, the MD gets a notice with “Update” and decides; this way an author's change never affects other MDs in the community (decision 9.2).
- R-05.3 Defines the lineup: which musician plays which instrument, one or several. By default the band's are used. With many musicians it stays short: one line per musician with their instruments, changed from a menu, and a filter by name (owner's review, October 16, 2026).
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
- R-06.7 **The band's audio:** the band's MD (and a set's temporary MD) can add one recording of a version for the band to practice with: an MP3 or M4A file of at most 15 MB, confirming the band has the right to use it. Like the layer, it is **private to the band**: only its members hear it, never visitors or other bands, and it is never part of the public version; storage refuses anyone else, not only the screen. It plays in a player across the bottom of the version page, a set's song and stand mode, drawn as the recording's real waveform with the song's sections over it in the order the chart plays them; the mark follows the audio, a section takes the audio there, and the chart follows it bar by bar, as with the YouTube video (R-03.11), which also says how the player keeps the chart readable and how its sections are named. Where the music starts is adjusted on screen and saved by the MD for the band. A set downloaded for offline keeps its songs' recordings, so they play with no connection. The MD can replace or remove it (owner's request, October 16, 2026).

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
- R-07.5 **Waitlist:** the Admin sees the people waiting (email, language, date joined), oldest first, and those already invited apart. **Invite** creates a single-use code noted with the person's email and marks them invited with it; the Admin copies the code and sends it themselves. Once the app can send email of its own (phase 2, email notices), Invite also emails the code in the person's language. Only admins see the waitlist.

**Acceptance criteria**

- Given a reported version, when the Admin hides it, then it disappears from the catalog and its owner receives a notice.
- Given a deactivated instrument, when an MD builds a new lineup, then it is not in the list, but earlier lineups keep it.
- Given a person on the waitlist, when the Admin taps Invite, then a single-use code noted with their email exists, they move to Invited with that code, and the code can be copied.

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

### SPEC-10 · Import from PDF

**Goal:** turn an existing chord sheet (chords written above the lyrics), pasted as text or uploaded as a PDF, into a ChartDown draft in minutes, so MDs don't retype their library and nobody has to start from a blank editor. The import keeps the structure and the chords and discards the lyrics. The draft is a starting point the MD corrects, then adds notes to (owner's request and the first playground tester's feedback, October 15, 2026).

**Phase:** 2 (during the beta, section 7).

**Requirements**

- R-10.1 A user uploads one PDF with a text layer containing one song. Files up to 5 pages and 5 MB.
- R-10.2 The importer reads the title, writers, key, tempo and meter when present. It never imports license numbers, copyright lines or publisher footers. A tempo keeps its decimals (`74.5`); in 6/8, 9/8 or 12/8 the sheet doesn't say what it counts, so the importer writes it with `?` (`tempo: 58 ?`) and asks to confirm it in the review, never guessing (ChartDown 0.9, owner's decision, October 21, 2026).
- R-10.3 The importer detects sections from their headings (Intro, Verse, Pre-chorus, Chorus, Bridge, Instrumental, Tag, Ending, Outro, with numbers and letters such as “Verse 2” or “Bridge 1a”) and maps first and second endings and “go to” instructions to ChartDown repeats and endings. Anything it cannot map is flagged for review.
- R-10.4 The importer reads chords by their position above each lyric line, including slash chords, sus, extensions and chords outside the key. Chord-only lines that already use bar lines (`|`), such as instrumentals, keep their bars exactly.
- R-10.5 Chords are converted to numbers relative to the detected key, using the tonic-based system for minor keys (`1m`, `b3`, `b6`, `b7`). The user can choose to keep letters instead.
- R-10.6 **Bar proposal:** when the sheet has no bar lines, the importer proposes bars (by default one chord per bar, following the order of chord changes in each line) and marks every proposed row as “needs review”.
- R-10.7 **Lyrics are discarded.** The importer keeps only an optional landmark per section: its first words, 4 by default and never more than 8. The user can turn landmarks off before importing.
- R-10.8 The result opens in the chart editor as an unsaved draft with a review panel that lists every assumption: proposed bars, unknown chords, unmapped sections and the detected key. Nothing is saved until the user confirms, and the source is required before saving (R-02.2).
- R-10.9 The PDF is processed in the user's browser whenever possible. It is never stored on our servers, never kept after the import and never sent to third parties.
- R-10.10 Before the first import, the user confirms they have the right to use the files they import.
- R-10.11 A PDF without a text layer (a scan or a photo) is rejected with a clear message. Reading scanned sheets is a later phase.
- R-10.12 If a public version with the same title and source already exists, the importer suggests using it or forking it instead of creating a duplicate.
- R-10.13 **Paste:** the user can paste a chord sheet as plain text (chords over lyrics, as copied from a website or a document; up to 300 lines) instead of uploading a PDF. It goes through the same steps (R-10.2 to R-10.8 and R-10.12), and the pasted text is never stored. Paste comes first, then PDF (owner's decision, October 15, 2026).

**Acceptance criteria**

- Given a text PDF of an original test song with a key, three sections and chords over lyrics, when it is imported, then the draft has the right title, key, sections and chord numbers, and contains no lyric line longer than the landmark limit.
- Given a sheet with no bar lines, when it is imported, then every row with proposed bars is marked “needs review” in the editor.
- Given an instrumental line written with bar lines, when it is imported, then its bars match the sheet exactly.
- Given a sheet in E minor, when it is imported in numbers, then Em reads `1m`, G reads `b3`, C reads `b6` and D reads `b7`.
- Given the same original test song pasted as text, when it is imported, then the draft is the same as from its PDF.
- Given a scanned PDF, when the user uploads it, then the importer explains it can't read scans yet and nothing is created.
- Given any import, when it finishes, then the PDF is not stored anywhere on our servers.
- Given landmarks turned off, when the import finishes, then the draft contains no lyric text at all.

**Test data:** all test PDFs are made from original songs written for the project. Never commit chord sheets of published songs to the repository.

### SPEC-11 · Visual metronome and bar follow

**Goal:** while a musician practices or plays, the chart shows exactly where they are. A visual metronome pulses on every beat, highlights the current bar and moves to the next bar in time, with an optional click sound.

**Phase:** 2 (during the beta, section 7).

**Requirements**

- R-11.1 **Play and stop** from the viewer and from stand mode. The tempo comes from the chart's `tempo:` header (or the set, if it overrides it); without a tempo, the app asks for one.
- R-11.2 **Start anywhere:** the user taps a bar (for example bar 2 of the Chorus) and presses play; playback starts on that bar.
- R-11.3 **Visual pulse:** on every beat the current bar is highlighted and the beat is shown (for example "2 / 4"), so position never depends on color alone. Beat 1 is accented: the click is stronger, and the line along the bar's foot is drawn in full ink on beat 1 and in the quiet ink on the other beats. The line moves in steps, a beat at a time, by default; Metronome options' Beat line (Steps, Smooth) lets each person choose Smooth instead, where the line eases from beat to beat and grows the same way into every beat, beat 1 of a new bar included. The device keeps the choice (owner's review, October 21, 2026).
- R-11.4 **Follow the form:** playback moves bar by bar in **play order**: sections in order, `@use` sections, repeats (`|: :|`, `xN`) and first and second endings. In stand mode, the view moves to the next section on its own.
- R-11.5 **Meter aware:** the number of beats per bar comes from `meter:` (4/4, 3/4, 6/8, 12/8). Uneven splits (`:beats`) highlight the chord that sounds on each beat. In 6/8, 9/8 and 12/8 the tempo counts the dotted quarter, as charts and click tracks give it (6/8 at 68 is two beats of 68 a bar), while the metronome still counts and clicks every eighth; every other meter's tempo counts its own unit (owner's review, October 21, 2026). Since ChartDown 0.9 (R-00.18) a tempo may name its beat unit: the metronome plays every tempo from its speed in eighth notes per minute, so `58 q.`, `87 q` and `174 e` sound the same, and still clicks each beat of the meter. The tempo is shown with its unit in words where one is written ("Tempo 58, dotted quarter"), and as a number alone where none is.
- R-11.6 **Holds and fermatas:** a bar with a fermata (`~`) waits until the user taps to continue.
- R-11.7 **Click sound (optional):** off by default. When on, an accented click on beat 1 and a softer click on the others, with a volume control; in 6/8, 9/8 and 12/8 the first eighth of each group of three is a step under beat 1, so the groups are heard (owner's review, October 21, 2026). Every click sounds the same: it is drawn once and played from those samples, and while the metronome plays with the click on, a hum far below hearing keeps Bluetooth headphones and a display's speakers from sleeping between clicks and cutting some of them; Metronome options' Keep speakers awake, on by default and kept on the device, turns it off, as on studio monitors (owner's review on a Mac, October 21, 2026). Silent mode on the device is respected.
- R-11.8 **Count-in (optional):** one bar of clicks or pulses before the first bar.
- R-11.9 **Tempo adjust:** the user can change the tempo for practice (for example 80% speed) without changing the chart. Tap tempo sets a tempo by tapping.
- R-11.10 **Hands-free control:** the space bar starts and stops the metronome; Bluetooth page-turn pedals (which send arrow or page keys) turn sections, and while it plays they queue them as R-11.15 says (owner's review, October 14, 2026: the band moves by sections, not bars).
- R-11.11 **Works offline** in a downloaded set, and keeps the screen awake while playing.
- R-11.12 **Accurate timing:** clicks are scheduled with the Web Audio clock, not timers, so the beat doesn't drift over a whole song. Play feels instant: the first click sounds about 30 ms after the tap, the audio wakes silently at the person's first touch on the page, and the hum that keeps the speakers awake goes on 30 seconds after Stop, so playing again is heard at once (owner's review, October 21, 2026).
- R-11.13 **Reduced motion:** with the system's reduced-motion setting, the pulse becomes a steady highlight and a beat counter, with no flashing.
- R-11.14 **Personal:** each musician's metronome runs on their own device. Following the MD's metronome across the band is part of live mode (SPEC-12).
- R-11.15 **The musician leads the form:** while the metronome plays in stand mode, choosing a section (the song form, Next or Previous, a swipe or a pedal) queues it: the metronome finishes the section it is playing and goes on to the chosen one with no pause, then follows the play order from there. Choosing the section that is playing queues it again, as when the band is told to repeat the chorus. The screen stays on the section that sounds; the next line names the queued one ("Next: Chorus, again") and the song form marks it. Choosing the queued section again cancels it. Without the metronome, choosing a section moves to it at once (owner's request, October 14, 2026).
- R-11.16 **A tempo whose unit isn't confirmed (`?`, ChartDown 0.9):** the chart says so where its tempo shows ("Tempo 58, unit to confirm"), and Play first asks what the number counts, offering the meter's own readings (in 6/8, 9/8 and 12/8 the dotted quarter, as charts and click tracks give it, or the eighth note; otherwise the meter's beat or the dotted quarter), each with the speed it gives, and Tap tempo to check against the recording; the choice holds on that page until it is left. The chart is never rewritten by playing it (owner's decision, October 21, 2026).

**Acceptance criteria**

- Given a chart at 76 bpm in 4/4, when the user taps bar 2 of the Chorus and presses play, then bar 2 is highlighted, the pulse shows beats 1 to 4 at 76 bpm, and bar 3 is highlighted on the next beat 1.
- Given a section with `|: ... :| x2` and two endings, when playback reaches the repeat, then it goes back to the start of the repeat and plays the second ending on the second pass.
- Given the click sound turned off, when the metronome plays, then no sound plays and the visual pulse still runs.
- Given a 6/8 chart, when the metronome plays, then each bar shows six beats.
- Given a fermata bar, when playback reaches it, then it stops there until the user taps.
- Given the metronome playing the Chorus, when the musician taps the Chorus in the song form, then the Chorus plays to its end and starts again from its first bar, on the beat.
- Given the metronome playing Verse 2, when the musician taps the Bridge, then the screen stays on Verse 2, the next line says "Next: Bridge", and the Bridge starts on the beat after Verse 2's last bar.
- Given reduced motion turned on, when the metronome plays, then nothing flashes and the beat counter still advances.
- Given a downloaded set in airplane mode, when the user plays the metronome, then it works the same.
- Given a 4-minute song, when it plays to the end, then the last beat lands within 20 ms of the expected time.

### SPEC-12 · Live mode (the band follows the MD)

**Goal:** during a rehearsal or a service, the music director runs the set and every musician's screen follows. When the MD moves from the Verse to the Chorus, or to the next song, every connected device moves too.

**Phase:** 2 (after SPEC-11).

**Requirements**

- R-12.1 **Start live:** the MD (or the set's temporary MD) starts a live session for a set. Only one leader per session.
- R-12.2 **Join:** musicians in the set's lineup see "Live now" on Home, in Notices and on the set, and join with one tap. The leader sees who is connected.
- R-12.3 **Follow:** when the leader moves to another section or song, every connected device shows the same section within half a second on the venue network. Each musician still sees only the notes for everyone and for their instruments (R-06.4).
- R-12.4 **Cue next:** the leader can mark the next section ahead of time (for example "Chorus next" or "Repeat the Bridge"). Followers see the cue on screen before the change happens.
- R-12.5 **Look ahead and come back:** a musician can scroll away to look at another part; a "Back to live" button returns them to where the leader is. Their device never changes the leader's position.
- R-12.6 **Changes on the fly:** if the leader skips a section, repeats one or changes the song order, followers follow; nobody needs to edit the set.
- R-12.7 **Shared tempo (with SPEC-11):** when the leader plays the metronome, followers see the same beat and current bar in sync. The click sound stays a personal choice on each device.
- R-12.8 **Hands-free for the leader:** the leader controls the session with the space bar or a Bluetooth pedal.
- R-12.9 **Bad connection:** if a follower loses the connection, their device keeps working on its own with the downloaded set and shows "Offline – following paused". When the connection comes back, it jumps to the leader's position.
- R-12.10 **End:** the leader ends the session; followers stay on the last position and get a notice that live mode ended. A session also ends if the leader is disconnected for more than 5 minutes.
- R-12.11 **Hand over:** the leader can pass control to the temporary MD or another member during the session.
- R-12.12 **Privacy:** only members of the band in the set's lineup can join. The session shares positions and cues, never personal data.

**Acceptance criteria**

- Given the MD in live mode with three musicians connected, when the MD moves from Verse 1 to the Chorus, then all three devices show the Chorus within half a second.
- Given the MD marks "Bridge next", when followers look at their screen, then they see the cue before the MD moves.
- Given a keys player who scrolled to the Outro, when they tap "Back to live", then they return to the MD's current section.
- Given a follower whose connection drops, when it comes back, then their device jumps to the MD's current position and the "following paused" message disappears.
- Given a musician who is not in the band, when they try to join the session, then they can't.
- Given the MD ends the session, when followers look at their screen, then they stay where they were and see that live mode ended.

## 7. Phases

| Phase                                      | Includes                                                                                                                                                                                                                                          | Outcome                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 0                                          | Constitution, specs and decisions                                                                                                                                                                                                                 | Specs approved (done)                                                                                   |
| 1 (MVP)                                    | SPEC-00 (R-00.1 to R-00.16: ChartDown 0.7 and its conformance suite), 01, 02, 03 with layer editor, 04, 05 with key per set and temporary MD, 06, 08 offline reading, 09 in-app notices                                                           | A real band prepares a set, each musician reads their notes and plays without depending on the internet |
| 2 (from October 14, 2026, during the beta) | Advanced stand mode, print and export to PDF (R-03.4), invite links, email notices, revision comparison, advanced search; import from PDF (SPEC-10), visual metronome and bar follow (SPEC-11), live mode where the band follows the MD (SPEC-12) | Comfortable use in rehearsal and on stage                                                               |
| 3                                          | Full administration and reports, WhatsApp notices, offline editing, native phone app                                                                                                                                                              | Platform open to the public                                                                             |

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
- A native phone app (the web app reads on phones, R-03.8).
- Audio playback of songs or YouTube sync (the metronome's click, SPEC-11, is not song playback).
- Payments or subscriptions.

## 11. Next step

The specs are approved. The next stage is the Technical Plan: architecture, data model, authentication, offline sync and notifications.
