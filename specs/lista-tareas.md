# ChartDown App – Task List (MVP)

**Version:** 1.1 · **Date:** October 3, 2026 · **Based on:** SDD Plan v0.2, Technical Plan 1.0, Design Handoff 1.0, ChartDown 0.4

Every task is small, has its requirements (R-xx) and is done only when its tests pass. The order follows dependencies: a task does not start until the tasks it depends on are done.

**Sizes:** S = up to 1 day · M = 2 to 3 days · L = 4 to 5 days (estimate for one person working with Claude Code).

## Definition of done

1. Meets every acceptance criterion of its requirements.
2. Every requirement has at least one test with its id in the name (for example, “R-06.4 a musician never receives notes for another instrument”).
3. Passes continuous integration: formatting, lint, types, tests, build and traceability.
4. The UI follows the Design Handoff (tokens, components, accessibility).
5. If a rule changed, the spec was updated first.
6. The pull request title starts with its task id (for example, “T-101: port the parser”). Work that belongs to no task (dependency updates, typo fixes) starts with “chore:” and has no requirements to check.
7. Every requirement id named in a test exists in the SDD Plan, so a mistyped id never counts as coverage.

## Milestones

| Milestone | Includes | Outcome |
|---|---|---|
| M1 | E0, E1, E2 | Repository ready, ChartDown core and visual components |
| M2 | E3, E4 | Database with permissions and invite-only accounts |
| M3 | E5, E6 | Catalog, versions, editor and stand mode |
| M4 | E7, E8 | Bands, sets and per-instrument view |
| M5 | E9, E10, E11 | Offline, notices and minimal administration |
| M6 | E12 | Landing page, terms and a beta with a real band |

## E0 · Repository and foundation

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-001 | Monorepo with pnpm and Turborepo: `packages/core`, `packages/ui`, `apps/web`, `supabase/`, `specs/` | Technical Plan 9 | – | S | The project installs and builds from scratch |
| T-002 | Continuous integration on GitHub Actions: formatting, types, tests and the traceability rule (tests named with R-xx) | Definition of done | T-001 | S | A PR without tests for its requirement fails |
| T-003 | Supabase projects (development and production), Vercel, and the `chartdown.app` domain on Cloudflare | Technical Plan 12.4 | T-001 | S | The empty app responds at chartdown.app |
| T-004 | Add the approved specs to `specs/` in markdown | Constitution | T-001 | S | All specs are in the repository |

## E1 · `@chartdown/core` (SPEC-00)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-101 | Port the playground parser to TypeScript with a typed syntax tree | R-00.3 | T-001 | M | The three examples from the Language repository parse with no warnings |
| T-102 | Conformance suite: one case per rule of spec 0.4 | R-00.3, R-00.4 | T-101 | M | Every spec section has passing cases |
| T-103 | Numbers and letters, transposition and key changes (`@key`) | SPEC-00 | T-101 | S | Transposing G → A, and Em with `b3`, gives the right chords |
| T-104 | Instruments: list injected from the Admin's catalog plus those declared in the header | R-00.1 | T-101 | S | An unknown instrument warns and is shown to everyone |
| T-105 | MD layer format: notes anchored to section and bar; detect “unplaced” notes (documented as ChartDown 0.5) | R-00.2 | T-101 | M | Renaming a section flags its notes without losing them |
| T-106 | Warning for lyric landmarks longer than 8 words | Constitution 6 | T-101 | S | A 9-word landmark produces a warning |
| T-107 | Publish `@chartdown/core` to npm under MIT | Technical Plan 12.6 | T-102 | S | The package installs in a new project |

## E2 · Design system in code

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-201 | Tokens as CSS variables (light and dark) and self-hosted fonts | Handoff 2 | T-001 | S | AA contrast verified in both themes |
| T-202 | Icon, Button and InstrumentTag components (default and compact) | Handoff 3 | T-201 | M | 44 px buttons, visible focus, accessible labels |
| T-203 | Bar, Section, MDNote and FormStrip components rendering the `@chartdown/core` tree | Handoff 3 | T-202, T-101 | L | The example chart looks like the approved design |
| T-204 | English and Spanish i18n foundation | R-01.5 | T-001 | S | Switching to Spanish translates the whole UI, never the syntax |

## E3 · Database and permissions

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-301 | Tables for profiles, instruments, songs, versions, sources and revisions | SPEC-02 | T-003 | M | Migrations apply and roll back cleanly |
| T-302 | Bands and members with one MD per band; personal space created with every account | R-04.1, R-04.7, decision 2 | T-301 | M | A second permanent MD cannot be created |
| T-303 | Layers and MD notes; sets, set items, lineup and temporary MD | SPEC-05, decision 9.1 | T-302 | M | One layer per band and version |
| T-304 | Row-level security on every table, with SQL tests | R-06.4, permission matrix | T-303 | L | A musician cannot read another instrument's or another band's notes |
| T-305 | Event log and tables for notices and preferences | SPEC-09 | T-303 | S | Every important change writes an event |

## E4 · Accounts and access (SPEC-01)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-401 | Email and password, Google, Apple and Microsoft, with account recovery | R-01.1, Technical Plan 12.1 | T-301 | M | One person signs in two ways into the same account |
| T-402 | Invite codes and waitlist | R-01.7, R-01.8 | T-401 | M | No code, no account; the waitlist stores the email |
| T-403 | Profile: name, language and instruments | R-01.2 | T-401, T-204 | S | The chosen language persists across sessions |
| T-404 | Visitors read the public catalog without an account | R-01.4 | T-304 | S | Forking asks the visitor to sign in |
| T-405 | Delete account: personal data deleted and public versions credited to “ChartDown” | R-01.6, decision 9.5 | T-401 | S | No personal data remains after deletion |
| T-406 | Transactional email provider for sign-in emails (confirmation, recovery) in production | Technical Plan 12.1 | T-401, T-003 | S | A confirmation email from chartdown.app arrives within a minute |

## E5 · Catalog and versions (SPEC-02)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-501 | Create a song and a version with a required source; public by default | R-02.1 to R-02.3 | T-304 | M | Saving without a source shows a clear error |
| T-502 | Immutable revisions, history and restoring an earlier one | R-02.8 | T-501 | M | Restoring revision 3 creates a new revision |
| T-503 | Fork with a reference to the original and its author | R-02.6, R-02.7 | T-501 | S | The fork shows “Based on the version by…” |
| T-504 | Make private: private copy for the owner and a frozen public version | R-02.4, decisions 6 and 9.4 | T-502 | M | Other people's sets still open the public version |
| T-505 | Catalog screen with search and source filters | R-02.9, R-02.10 | T-501, T-202 | M | A private version never appears in results |

## E6 · Editor and viewer (SPEC-03)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-601 | ChartDown editor with live preview and line-numbered warnings | R-03.1 | T-203, T-502 | L | The preview updates without reloading |
| T-602 | Viewer with numbers or letters and transposition | R-03.2 | T-203, T-103 | S | Changing the key does not change the saved version |
| T-603 | MD layer editor | R-03.5 | T-303, T-105, T-203 | L | A new note is saved in the layer and the public version doesn't change |
| T-604 | Stand mode on iPad, light and stage | R-03.3 | T-203 | M | Every section reads without zooming on an iPad in landscape |

## E7 · Bands and sets (SPEC-04 and SPEC-05)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-701 | Create a band, invite, accept, remove and leave | R-04.1 to R-04.5 | T-302, T-401 | M | Whoever leaves the band loses access to its sets |
| T-702 | Sets: name unique within the band, optional date, type, order and duplicate | R-05.1, R-05.2, R-05.6 | T-303 | M | A repeated name within the band is rejected |
| T-703 | Set lineup and key per song | R-05.3, R-05.4 | T-702 | S | The set key does not change the version for others |
| T-704 | Pinned revision per song and an “Update” button | R-05.2, decision 9.2 | T-702, T-502 | S | A new revision from the author doesn't change the set until accepted |
| T-705 | Temporary MD for a set | R-05.5, decision 9.6 | T-702 | S | Cannot edit other sets or the layer |
| T-706 | Set screen (`design/screens/01-set.html`) and the app's top bar (ChartDown, Sets, Catalog, Bands, Personal space, language, account) | Handoff 4 | T-703, T-202, T-801 | M | Matches the approved design |
| T-707 | Align the screens built before the design export with it: catalog, chart editor, MD layer editor and stand mode in a set (`design/screens/02` to `06`) | Handoff 4 | T-706, T-802 | M | Each screen matches the approved design |
| T-708 | Optional time of a set, shown with its date | R-05.1 | T-702 | S | A set at 9:00 shows “9:00 AM” with its date |

## E8 · Per-instrument view (SPEC-06)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-801 | Server function that returns each song in a set filtered by the opening musician's instruments | R-06.1, R-06.2, R-06.4 | T-304, T-703 | M | The keyboardist's device never receives the bass notes |
| T-802 | Integrate the view in stand mode and the set; “View as” for the MD; author's notes can be hidden | R-06.3, R-06.5, R-06.6 | T-801, T-604 | S | The MD switches views and sees every note |

## E9 · Offline (SPEC-08)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-901 | Installable app: manifest, logo icons and service worker | SPEC-08 | T-201 | S | Installs on the iPad home screen |
| T-902 | Download a set and read it with no internet | R-08.1, R-08.2, R-08.4 | T-801, T-901 | L | In airplane mode every song opens with its notes |
| T-903 | On reconnect, update and show what changed | R-08.3 | T-902 | M | A change made while offline appears as a notice |

## E10 · Notices (SPEC-09)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-1001 | Process that turns events into detailed notices | R-09.1 to R-09.4 | T-305 | M | Every notice says what changed |
| T-1002 | Realtime in-app notice inbox | R-09.3 | T-1001 | M | Adding Luis to the set reaches him instantly |
| T-1003 | Per-user notice preferences | R-09.5 | T-1001 | S | A disabled notice is not delivered |

## E11 · Minimal administration (SPEC-07)

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-1101 | Instrument catalog: create, rename and deactivate | R-07.3 | T-301 | S | An instrument in use cannot be deleted |
| T-1102 | Create and revoke invite codes | R-01.7 | T-402 | S | A revoked code stops working |
| T-1103 | Content reports and hiding versions | R-07.2 | T-505 | S | A hidden version leaves the catalog and its owner gets a notice |

## E12 · Landing page and beta

| ID | Task | Requirements | Depends on | Size | Tests / evidence |
|---|---|---|---|---|---|
| T-1201 | Landing page at chartdown.app with waitlist and invite-code sign-in | R-01.7, R-01.8 | T-402, T-201 | M | Matches the approved design and works on a phone |
| T-1202 | Terms of use (CC0 on publish, authorship on account deletion) and privacy notice, reviewed by a lawyer | Technical Plan 8 and 12.5 | – | S | Texts published and accepted at sign-up |
| T-1203 | Beta with a real band: prepare a set, play from an offline iPad and collect feedback | The whole MVP | E1 to E11 | M | Findings turned into new tasks or spec changes |
