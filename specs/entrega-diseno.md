# ChartDown App – Design Handoff

**Version:** 1.0 · **Date:** October 3, 2026 · **Status:** design approved

This sheet turns the approved design into exact rules for building the app. It is the reference for every UI task; anything not covered here is in the **ChartDown – Papel y tinta** design system and the **ChartDown App – Screens** canvas, both exported to `design/` in the repository (added October 5, 2026):

- `design/screens/` – the 7 approved screens as static HTML (`index.html` opens them). A visual reference: build them with the real components and tokens, never with their inline styles.
- `design/design-system/` – `tokens.json` (the same values as `packages/ui/src/tokens.css`), the brand book and each component's rules with a preview.
- `design/logo/` – logos, app icons and favicons; the app takes its icons from here (T-901).

## 1. Principles the code must respect

1. **The numbers win.** Only chords and bar lines are drawn in full-strength `ink`. Everything else uses `ink-muted`.
2. **Color means something.** Red (`md`) = music director and instruments. Blue (`dynamic`) = dynamics, links and focus. There is no other accent color.
3. **Never color alone.** Every MD note carries the word MD or the instrument's name; every dynamic is text.
4. **Two themes, one layout.** Light (*Papel*) and dark (*Escenario*) change only colors, never sizes or positions.
5. **Everything tappable is at least 44 px.**

## 2. Tokens

Implemented as CSS variables on `:root` (light theme) and `[data-theme="dark"]` (dark theme). The theme follows the system preference and the user can pin it.

### 2.1 Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `ground` | #EEF1F4 | #0F161D | Page background |
| `paper` | #FBFCFD | #17212B | Cards, top bar, chart sheet |
| `ink` | #16212C | #E6EDF3 | Chords, bar lines, main text |
| `ink-muted` | #566574 | #98A8B8 | Secondary text, next-section preview |
| `ink-inverse` | #FBFCFD | #0F161D | Text on an `ink` fill |
| `rule` | #B4BEC8 | #3A4857 | Decorative lines and card borders (never control borders) |
| `control-border` | #7D8A97 | #64748A | Borders of buttons, chips and inputs |
| `md` | #B8322A | #FF8478 | MD, instrument tags, song-map dots |
| `dynamic` | #1F4FA8 | #86AAFF | Dynamics, links |
| `focus` | = `dynamic` | = `dynamic` | 2 px focus ring with a 2 px offset |

Verified contrast (WCAG AA): all text ≥ 4.5:1 on `paper` in both themes; `control-border` 3.4:1.

### 2.2 Typography

| Style | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `chord-xl` | Barlow Condensed | 58 / 1 | 600 | Chords in stand mode |
| `chord-md` | Barlow Condensed | 44 / 1 | 600 | Chords in the editor and on desktop |
| `chord-sm` | Barlow Condensed | 34 / 1 | 600 | Next-section preview |
| `song-title` | Barlow Condensed | 52 / 1 | 600 | Song title |
| `section-title` | Barlow Condensed | 36 / 1 | 600 | Section name |
| `note` | Source Sans 3 | 18 / 1.4 | 400 | MD notes, reading text |
| `label` | Source Sans 3 | 16 / 1.25 | 600 | Buttons, emphasized text |
| `meta` | Source Sans 3 | 15 / 1.4 | 400 | Key, meter, tempo, chips |
| `dynamic-mark` | Source Sans 3 | 18 / 1 | 700 italic | Dynamics inside a bar |
| `caption` | Source Sans 3 | 14 / 1.3 | 400 | Small text; never smaller on iPad |
| `tag` | Source Sans 3 | 15 / 1.5 | 700 | Instrument name inside an InstrumentTag |
| `form-chip` | Barlow Condensed | 22 / 1 | 600 | Section abbreviation in the FormStrip |
| code | JetBrains Mono | 15 / 1.6 | 400 | ChartDown editor |

All three families are open-license Google Fonts. They are served by the app (not from Google) so they work offline.

### 2.3 Spacing, radii, strokes and sizes

| Group | Tokens |
|---|---|
| Spacing | `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-6` 24 · `space-8` 32 · `space-10` 40 |
| Radii | `radius-none` 0 (bars) · `radius-sm` 4 (chips, tags, cards) · `radius-md` 6 (buttons, inputs) |
| Stroke | `bar-line` 3 · `bar-line-light` 2 · `emphasis` 1.5 (red outlines: InstrumentTag and the View as button) · `hairline` 1 |
| Size | `target-min` 44 · `bar-height` 128 · `bar-height-sm` 64 |

## 3. Components

| Component | Props | States and rules |
|---|---|---|
| **Bar** | chords (root, quality, bass, beats), marks (hold, push, stab, fermata), dynamic, cues, ending, repeat start/end, lyric landmark | Square (`radius-none`); chords share the bar by beats; dynamic top-left; marks in `dynamic` (hold = diamond, push = `‹` before, stab = `^` above, fermata = `⌒` above); in number style the minor minus is raised at half size; slash bass inline (`5/7`); cues in `caption` at the top (a cue for everyone in `ink-muted`, an instrument cue led by its name in `md`); lyric landmark in `caption`, `ink-muted`, in quotes at the bottom; repeats as double bar lines with `×N`; endings with their label and a top line. Next-section preview: `bar-height-sm`, `chord-sm`, chords and lines in `ink-muted` |
| **Section** | name, bar count, visible notes, rows | `paper` card; notes come before the bars |
| **MDNote** | text, roles | For everyone: the word MD in `md`. For instruments: InstrumentTag. Plain notes in `ink-muted` |
| **InstrumentTag** | role, variant (default or compact) | Icon + name in `md`; compact = 44 px square with icon only and an `aria-label` |
| **Button** | variant (primary, secondary, view-as), icon, icon position | Minimum height 44; visible focus; a disabled button says why |
| **FormStrip** | sections (abbreviation, bar count, state, has notes) | States: played, current (inverted), upcoming; red dot = notes for you; announced in text |
| **Icon** | name, size | 24 px grid, 1.75 stroke; 20 px inside buttons; always with text |

**FormStrip abbreviations:** Intro I · Verse V1, V2 · Pre-chorus PC · Chorus C, C2 · Bridge B · Instrumental Inst · Tag T · Last Chorus LC · Outro O. Custom names: their initials.

**Icons from the approved screens** (`design/screens/`, same rules as the set): search, fork, public, private, history and check. The Icon component draws them exactly as the screens do.

**Instrument icons:** drums, bass, keys, guitar, vocals, saxophone, trumpet, trombone, violin. An instrument without an icon shows its name only.

## 4. Screens

| Screen | Specs covered | Implementation notes |
|---|---|---|
| Set (musician) | SPEC-05, 06, 08, 09 | Ordered list, set key, notes-for-you per song, lineup with compact InstrumentTag, offline status |
| Stand mode (light and stage) | SPEC-03, 06, 08 | Full screen; Previous/Next; navigable FormStrip; current section in `chord-xl`; next one in `chord-sm` |
| Catalog | SPEC-02 | Search; filter by source; song with its versions; open and fork |
| Chart editor | SPEC-00, 02, 03 | Text on the left, live preview on the right; public/private; history; parser warnings with line numbers |
| MD layer editor | SPEC-03 (R-03.5), 06 | Sections, tagged notes, per-instrument form, hide author's notes |
| Notices (T-1002) | SPEC-09 | Not in the Screens canvas yet; built from these tokens and components. Top bar: a "Notices" link with the unread count beside it (a `paper` badge (`radius-md`) with a `control-border` outline, `ink` text), announced in text ("Notices, 3 unread"); no bell until the design system adds one (section 7). The `/notices` page: newest first; each notice is one sentence saying what changed, in the reader's language, with its set or song and when; unread ones carry the word "New" in `md`; opening one marks it read and goes to what it is about; "Mark all as read". A new notice arrives without reloading |
| Landing (chartdown.app) | SPEC-01 (invites) | `design/screens/07-landing.html`, at `/` for visitors (signed-in people get their home): top bar, hero, how it works, built for the stage, the open language, join the beta, footer. Waitlist, sign-in with invite code, link to the language on GitHub (github.com/ChartDown/Language). T-1201 decisions: the hero's example chart is drawn with Bar, MDNote and InstrumentTag from the same ChartDown text the language section shows, and its view-as is a static label ("Viewing as Drums"), never a control that does nothing; "Try the notation" goes to the language section; "Built for the stage" has the design's four cards (offline sets, stand mode, your part only, every change saved), its text without the abbreviation MD; the top bar adds "Catalog" where sign-in is enabled, so visitors still browse it (R-01.4); the footer has no Terms or Privacy until T-1202; the headline uses `type-song-title`. The app's top bar is not shown over it. Works on a phone with no sideways scrolling |

## 5. Responsive

- **iPad landscape (1180 px) and desktop:** reference layout; content max width 1280 px with 40 px margins.
- **iPad portrait and narrower screens:** rows of 4 bars stay; side panels move below; toolbars wrap.
- **Phone:** out of MVP scope; even so, no screen may break or scroll sideways.

## 6. Accessibility

- AA contrast in both themes (already verified in the tokens).
- Real buttons, links and inputs; never clickable elements without a role.
- Every icon-only control has an `aria-label`; the song map announces state and notes.
- Visible keyboard focus everywhere; tab order top to bottom, left to right.
- Respect reduced-motion preferences: no auto-scrolling animations.

## 7. Logo and icons

- The `chartdown-logo` package: mark (light, dark, one-color), logos with the name, app icons from 1024 to 152 px, a maskable icon and the favicon (SVG that adapts to dark mode, plus PNG and ICO).
- Site and app use `favicon.svg` and `apple-touch-icon.png`; the web app manifest uses the 192 and 512 px icons and the maskable one.
- The text in the logos is already converted to outlines.

## 8. Sources of truth

- **Design system:** ChartDown – Papel y tinta (tokens, components, brand book, Logos group).
- **Screens:** ChartDown App – Screens canvas.
- **Language:** ChartDown/Language repository, spec 0.4.
- If code and design disagree, fix the code or update the design system first, never just one of them.
