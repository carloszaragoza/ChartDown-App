# ChartDown App – Screens

Every screen uses `AppShell` with the side navigation, and a `Layout` with a page header (`LayoutHeader` with breadcrumbs or an overline, `Heading level={1}`, an optional description, and actions on the right). Screenshots: `screens/light/<file>.png` and `screens/dark/<file>.png`.

## App shell and main menu (all screens)

- **Specs:** SPEC-01 (language, roles), SPEC-09 (notices).
- **SideNav** (`collapsible`):
  - **Header:** `SideNavHeading` "ChartDown" with the current band as subheading. Its menu switches between the user's bands and Personal space, plus "All bands".
  - **Home** first (the screen shown after sign-in), then **Notices**, with a red `Badge` showing the unread count.
  - **Play:** Sets, Stand mode.
  - **Create:** Catalog, New version, Chart editor, MD notes.
  - **People:** Bands, Personal space.
  - **Administration** (admins only): Overview, Instruments, Invite codes, Reports (warning `Badge` with open reports).
  - **Footer:** language `SegmentedControl` (English / Español) and the user `Item` (avatar, name, role and instrument) that opens the profile, with a Sign out icon button.
- On a phone, the side nav becomes a drawer (Astryx default).

## 00 · Home — `00-home.png`, `00-home-musician.png`, `00-home-new-user.png`
- **Purpose:** the first screen after sign-in. It answers "what's next, what needs me, and how is my work doing?"
- **Specs:** SPEC-05 (sets), SPEC-06 (notes for you), SPEC-08 (offline), SPEC-09 (notices), SPEC-02 (versions), SPEC-04 (bands).
- **Header:** today's date as overline; "Good morning / afternoon / evening, {first name}"; role and instruments in the main band. Actions: "Create set" and primary "New version" (only for users who can create).
- **Next up `Card`:** the nearest upcoming set across all bands: relative day, name and type, band, date and time, song count, the instrument the user plays in it, offline `StatusDot`, a red `Token` "N notes for you", the first songs with their set keys, and buttons "Start stand mode" (primary) and "Open set". If there's no upcoming set, show an `EmptyState` with "Create set".
- **Stats `Grid`** (4 `Card`s, one row on desktop, wraps on narrow screens): Bands, Upcoming sets, My versions (public / private), Musicians in your bands. Each card links to its screen.
- **"How your versions are used" `Card`:** period `SegmentedControl` (7 days, 30 days, All time); summary line ("N musicians in M bands played your public versions"); `Table` with version, bands and musicians, plus a small horizontal bar relative to the top version. Counts come from sets that include the version in the period. Only the user's **public** versions; never show who the other bands are.
- **Recent activity:** the latest 3 notices as a `List`, with "All notices".
- **End panel (340), "For you":**
  - **Needs your attention:** actionable items only: new revisions to review in your sets (MD), pending invitations (MD), open reports (admins), invitations to join a band (musicians). Hidden when empty.
  - **Your band:** members of the current band with `Avatar`, name and instrument, and "Manage" (MD). Users in several bands see the band chosen in the side nav switcher.
  - **Your instruments:** red instrument `Token`s with icons and "Edit" (opens the profile).
- **Three variants** (the prototype has a "Prototype preview" banner to switch between them; **don't build that banner**, it's only for review):
  - **Music director** (`00-home.png`): everything above.
  - **Musician** (`00-home-musician.png`): same next-up card and stats. Instead of the usage table (no public versions yet), a card "Share your own arrangements" with "New version". "Needs your attention" shows new notes for their instrument and changes in their sets. "Your band" has no Manage button and marks the user with "(you)".
  - **New user** (`00-home-new-user.png`, no bands and no versions): header "Welcome to ChartDown, {first name}"; a "Get started" `Card` with a 4-step checklist (choose your instruments, join or create a band, publish your first version, create your first set), each with a button and a "Done" state, and a "N of 4 done" counter; an `EmptyState` "No upcoming sets". End panel with help: how to join a band and a link to the ChartDown guide.
- The variant comes from the data (role in the current band, number of versions and bands), not from a setting.
- **Privacy:** usage numbers are aggregated counts. Never reveal names of other bands or musicians that use a version.

## 01 · Notices — `01-notices.png`
- **Specs:** SPEC-09 (R-09.1 to R-09.3).
- **Layout:** content width 760. Header action "Mark all as read" (disabled when nothing is unread).
- **List** of notices: unread = accent `StatusDot` and semibold title; read = neutral dot. Description says exactly what changed. Time on the right.
- **Interactions:** tapping a notice marks it read and opens the set or song.
- **Empty state:** "You're all caught up".

## 02 · Set (musician) — `02-set.png`
- **Specs:** SPEC-05, SPEC-06, SPEC-08.
- **Header:** band and set type overline, set name, date and song count, offline `StatusDot` "Offline ready". Actions: "Edit set" (MD only), primary "Start stand mode".
- **Content:** `List` of songs with number marker, title, source, key `Token` and "N for you" (red `StatusDot`) or "No notes".
- **End panel (340):** Lineup list with `Avatar`, name, role and instrument.

## 03 · Stand mode — `03-stand-mode.png`
- **Specs:** SPEC-03 (R-03.3), SPEC-06, SPEC-08.
- **Header:** back to set, set name and position ("Song 1 of 6 · Offline ready"); "View as" `SegmentedControl` (MD only: Everyone / instruments); Previous and primary Next.
- **Content:** song title with key, meter and tempo `Token`s; song form as `TabList` with chart abbreviations (I, V1, C, V2, C2, B, LC); the current section in a `Card` with title, bar count, `MDNotes` and `BarRow`s; next-section preview with `BarRow size="sm"`.
- **Rule:** musicians only receive notes for everyone and for their instruments (filtered on the server, R-06.4).

## 04 · Catalog — `04-catalog.png`
- **Specs:** SPEC-02 (R-02.9, R-02.10).
- **Header:** "New version" primary action.
- **Content:** search `TextInput` and source filter `SegmentedControl`; a `Card` per song with its versions as `List` items (source `Token`, detail, author, key, meter, public icon, Open and Fork buttons); other songs as list rows with their version count.

## 05 · New version — `05-new-version.png`
- **Specs:** SPEC-02 (R-02.1 to R-02.3), SPEC-03 (R-03.1).
- **Header:** breadcrumbs Catalog / New version; title becomes the song title as typed; actions "Choose another song" (ghost) and "Publish version" (primary, disabled until title and source are set, with a tooltip explaining what's missing).
- **Start panel (400):** `FormLayout` with Song title (required), Artists, Arrangement by, Source `RadioList` (required), Album, Year and YouTube link (optional); CC0 info `Banner`.
- **Content:** ChartDown `TextArea` with parser status, and a live preview of sections and bars.

## 06 · Chart editor — `06-chart-editor.png`
- **Specs:** SPEC-02 (R-02.4, R-02.8), SPEC-03 (R-03.1, R-03.2).
- **Header:** source, revision and save time as overline; Public / Private `SegmentedControl`; History; primary Save.
- **Start panel (460):** ChartDown `TextArea` with "No warnings" status. **Content:** live preview.

## 07 · MD notes (band layer) — `07-md-notes.png`
- **Specs:** SPEC-03 (R-03.5), SPEC-06 (R-06.6).
- **Header:** band overline, song and source title, privacy description; "Hide the author's notes" `Switch`.
- **Start panel (260):** sections `List` with note counts.
- **Content:** notes `List` (red `Token` for MD or instrument, text, edit icon button), the section's bars, and the "Add a note" form (who it's for `SegmentedControl`, note `TextInput`, primary "Add note").

## 08 · Bands — `08-bands.png`
- **Specs:** SPEC-04 (R-04.1, R-04.5, R-04.7).
- **Content:** `List` of bands (rounded `Avatar`, name, members, pending invitations, next set; role `Token`, Sets button). Personal space appears as a private row.
- **End panel (340):** "Create a band" with name `TextInput` and primary button, disabled until a name is typed.

## 09 · Band detail — `09-band-members.png`, `09-band-invitations.png`, `09-band-settings.png`
- **Specs:** SPEC-04 (R-04.2 to R-04.4).
- **Header:** breadcrumbs Bands / band name; "You are the music director of this band."; primary "Sets".
- **Tabs:** Members (`Table`: musician, role `Token`, default instruments, "Edit instruments"); Invitations (invite `Card` with email `TextInput` and "Send invitation", then pending `List` with Cancel); Settings (band name and Save).

## 10 · Personal space — `10-personal-space.png`
- **Specs:** SPEC-04 (R-04.7), SPEC-05.
- **Header:** breadcrumbs Bands / Personal space; title "My sets"; "Only you" `Token` and explanation.
- **Content:** tabs Upcoming / Past with counts; `EmptyState` when empty; sets as `List` items with date, type `Token` and "Add songs".
- **End panel (360):** "Create a set": name (required), `DateInput` and `TimeInput` (optional), type `Selector` (Practice, Rehearsal, Service, Concert); "Create set" disabled until name and type are set.

## 11 · Admin overview — `11-admin-overview.png`
- **Specs:** SPEC-07.
- **Content:** responsive `Grid` of `Card`s (Instruments, Invite codes, Reports), each with icon, live count, description and an "Open" button. A warning `StatusDot` marks areas that need attention.

## 12 · Instruments — `12-admin-instruments.png`
- **Specs:** SPEC-07 (R-07.3), SPEC-00 (R-00.1).
- **Header:** count of active instruments; primary "Add instrument".
- **Content:** `Table`: instrument (icon, English and Spanish name), id in charts (code), names charts also accept, status (`StatusDot` + "N musicians"), edit and deactivate/activate icon buttons. Instruments are never deleted.
- **End panel (320):** add or edit form. The id is locked when editing.

## 13 · Invite codes — `13-admin-invite-codes.png`
- **Specs:** SPEC-01 (R-01.7), SPEC-07.
- **Content:** "Create a code" `Card` with kind `Selector`, uses (locked to 1 for single use) and who it's for; codes `Table` with code (code font + copy button), kind, uses, for, created, status and "Revoke" (destructive, only for active codes).

## 14 · Reports — `14-admin-reports-open.png`, `14-admin-reports-hidden.png`
- **Specs:** SPEC-07 (R-07.2).
- **Tabs:** Open reports and Hidden versions, with counts.
- **Open:** `List` items with version, reason `Token`, reporter and date, quoted comment; actions View, Dismiss, Hide version (destructive). **Hidden:** list with "Show again". Both tabs have an `EmptyState`.

## 15 · Profile — `15-profile.png`, `15-profile-notices.png`, `15-profile-account.png`
- **Specs:** SPEC-01 (R-01.2, R-01.5, R-01.6), SPEC-09 (R-09.5).
- **Header:** large `Avatar`, name, email, role and instrument count.
- **Profile tab:** name, language `SegmentedControl`, instruments in three `CheckboxList` cards (Rhythm, Harmony, Voice and horns); "Save profile" enabled only with unsaved changes.
- **Notices tab:** `Switch`es grouped by Your sets, Songs in your sets, As music director, Your versions; info `Banner`; saved on change.
- **Account tab:** sign-in methods list; "Delete your account" `Card` with consequences and an email confirmation that enables the destructive button.
