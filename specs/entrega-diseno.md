# ChartDown App – Design Handoff

**Version:** 2.0 · **Date:** October 6, 2026 · **Status:** design approved

Version 2 moves the app to the **Astryx** design system. It replaces version 1, "Papel y tinta" (October 3, 2026), whose files stay in `design/` as history. This sheet turns the approved design into exact rules for building the app; anything not covered here is in `design/astryx/`:

- `design/astryx/screens/light/` and `screens/dark/` – a screenshot of every screen and tab, 1280 px wide, in both modes.
- `design/astryx/SCREENS.md` – one section per screen: purpose, specs, Astryx components, states and interactions.
- `design/astryx/prototype.html` – the clickable prototype; `reference-code/` – its source and pinned dependencies.
- `design/logo/` – the logo kit (section 7).

The redesign is built in the blocks of E13 (`lista-tareas.md`); until a screen's block is merged, that screen keeps its version 1 look.

## 1. Principles the code must respect

1. **Color means something.** Red (Astryx `color="red"` tokens, the error color) = music director and instruments, never decoration. Accent (blue) = dynamics, links and selection.
2. **Never color alone.** Every music director's note says "MD" or the instrument's name; every status dot has a visible text label beside it.
3. **The numbers win.** In a chart only chord numbers and bar lines are drawn in the primary text color; everything else is secondary.
4. **Two modes, one layout.** Light and dark follow the system; they change colors, never sizes or positions.
5. **Touch targets:** at least 44 × 44 px on iPad, to tap with confidence. Astryx's default sizes are smaller (side navigation items 32 px, the language control 20 px, the collapse button 28 px, measured October 7, 2026). The app's Astryx theme (`apps/web/theme/chartdown.theme.ts`, built from neutral) raises the element sizes on touch screens (`pointer: coarse`): small 36, medium 44, large 52 px; the side navigation uses the large size. Desktop with a mouse keeps Astryx's sizes. A control is never shrunk below 44 px on touch.
6. **One gutter.** Every page in the app shell keeps 32 px (`--spacing-8`) between its content and the side navigation, the top and the other edges: Astryx pages with `Layout padding={8}`, version 1 pages with the same padding until they are redesigned. Fields and buttons never run past that edge. Stand mode and the landing page set their own (owner's review, October 7, 2026).

## 2. Design system: Astryx

- **Library:** `@astryxdesign/core` with the `@astryxdesign/theme-neutral` theme (version 0.6.5, MIT), icons from `@heroicons/react`. `@stylexjs/stylex` is its peer; `@astryxdesign/cli` is a development tool.
- **Theme:** the root layout wraps the app in `<Theme theme={neutralTheme} mode="system">`, after `reset.css`, `astryx.css` and the theme's `theme.css`.
- **Use Astryx components for everything they cover:** `AppShell`, `SideNav`, `Layout` (`LayoutHeader`, `LayoutContent`, `LayoutPanel`), `List`/`Item`, `Table`, `TabList`/`Tab`, `Card`, `Section`, `Button`, `TextInput`, `TextArea`, `Selector`, `RadioList`, `CheckboxList`, `Switch`, `SegmentedControl`, `DateInput`, `TimeInput`, `Token`, `Badge`, `StatusDot`, `Avatar`, `Banner`, `EmptyState`, `Breadcrumbs`, `Heading`, `Text`, `Icon`, and the layout stacks (`VStack`, `HStack`, `Grid`). Dense data goes in rows (`Table`, `List`), never in a card per item; a status is a `StatusDot` or `Token`; a `Badge` is only for counts.
- **Check a component's API before using it** with the Astryx CLI (`npx astryx component <Name> --dense`); never guess props.
- **No raw colors, pixel sizes or custom CSS.** Use component props and theme tokens (`var(--color-*)`, `var(--spacing-*)`, `var(--radius-*)`, `var(--border-width)`). The only custom visuals are the chart components and the logo (section 3).
- **Fonts:** the theme's Figtree for the interface and its monospace stack for code. Figtree is served by the app (SIL Open Font License), never from the internet, so a downloaded set opens with no connection.

## 3. Custom components (`packages/ui`)

| Component | Rules |
|---|---|
| **BarRow** | A row of bars of a chart, rendered from the `chartdown` tree (never a simplified parser). Square bar lines (three times the border width, primary text color; twice, emphasized border color, in the small size); chord numbers in large tabular figures; minor and quality marks as superscripts at half size; dynamics in italics in the accent color, top left of the bar. `size="sm"` is the next-section preview: smaller and in the secondary color. Four bars per row. |
| **MDNotes** | A music director's notes: a red `Token` with "MD" (for everyone) or the instrument's name and icon, followed by the note's text. |
| **Instrument icons** | Drums, bass, keys, guitar, vocals, saxophone, trumpet, trombone, violin: stroke icons on a 24 px grid, the same drawings as version 1. Red only inside instrument contexts. An instrument without an icon shows its name only. |
| **ChartDownLogo** | Section 7. |

## 4. Screens

Every screen uses `AppShell` with the side navigation and a `Layout` with a page header (breadcrumbs or an overline, a level-1 `Heading`, an optional description, actions on the right). `design/astryx/SCREENS.md` describes each one; these are the decisions ChartDown adds to it.

| Screen | Specs | Decisions |
|---|---|---|
| **App shell** | SPEC-01, 09 | Collapsible `SideNav`; a drawer on a phone. Header: the logo and the current band, whose menu switches between the person's bands, Personal space and "All bands"; the choice is remembered in a cookie. Notices first, with a red `Badge` for the unread count, live (T-1002). Sections: Play (Sets; Stand mode, which opens the next upcoming set), Create (Catalog, New version, Chart editor, and the design's "MD notes", which the interface calls Director's notes, since "MD" in interface text is ChartDown syntax), People (Bands, Personal space), Administration for admins only (Overview, Instruments, Invite codes, Reports, with a warning `Badge` for open reports). Footer: the language `SegmentedControl` and the person's `Item` (avatar, name, role and instrument) that opens the profile, with a Sign out icon button. Chart editor and Director's notes open **Your versions** (`/versions/mine`), the person's own versions, each with Edit and MD notes; on a version's own pages they open that version. A visitor's side navigation has Catalog and Sign in. The shell's `<main>` holds the page, so pages render no `<main>` of their own. Stand mode, the offline reader and the landing page have no shell: they fill the screen. The design's stand mode screenshot keeps the side navigation; the owner chose full screen (October 7, 2026). |
| **01 Notices** | SPEC-09 | As designed; a notice says exactly what changed (T-1001) and opening it marks it read. |
| **02 Set (musician)** | SPEC-05, 06, 08 | As designed; "Offline ready" when the set is downloaded on this device (T-902). |
| **03 Stand mode** | SPEC-03, 06, 08 | As designed, for a version and in a set, and in the offline reader. "View as" only for the music director (R-06.3); musicians only receive notes for everyone and their instruments, filtered on the server (R-06.4). |
| **04 Catalog** | SPEC-02 | As designed. |
| **05 New version · 06 Chart editor** | SPEC-02, 03 | As designed; the preview renders the real `chartdown` tree with `BarRow`. |
| **07 MD notes** | SPEC-03, 06 | "Who it's for" keeps **several instruments** per note (a multiple choice, not a `SegmentedControl`), since a note can be for more than one instrument. |
| **Version** (`/versions/[id]`) | SPEC-02, 03, 06 | Not in the design. `Layout` header: overline with the artists and the source, the song title, key and meter `Token`s; actions on the right: primary Stand mode, then Fork, My notes and Add to a set, with Report in an overflow menu. Below: Numbers / Letters and the key as `SegmentedControl` and `Selector`, the song form as in stand mode, and each section in a `Card` with `BarRow`s and `MDNotes`. |
| **History · Revision · Make private** | SPEC-02 (R-02.4, R-02.8) | Not in the design. History: breadcrumbs Catalog / song / History; a `List` of revisions (number, date, author, "Current" `Token`) with View and Restore. A revision: a read-only `Banner` and the chart as on Version. Make private: a `Card` with the consequences (the public version is frozen and stays public; a private copy is made) and a primary confirmation. |
| **Song** (`/songs/[id]`) | SPEC-02 (R-02.5, R-02.9) | Not in the design. Breadcrumbs Catalog / song; the title, its artists and how many public versions it has; its public versions as a `List` (source `Token`, author, album and year, "Frozen" `Token` when frozen), each opening its Version page. Private versions never appear. |
| **08 Bands · 09 Band detail · 10 Personal space** | SPEC-04, 05 | As designed. Set types stay Rehearsal, Service and Concert (no "Practice"). Band detail's tabs live in the address (`?tab=members`, `invitations`, `settings`). Leaving the band, which the design doesn't show, is a destructive `Card` in the Settings tab (owner's decision, October 7, 2026). |
| **Sets · Edit set · Song in a set** | SPEC-05, 06 | Not in the design. Sets: every set of the person's bands and personal space as in screen 10 (Upcoming / Past tabs, `List` items with date, band and type `Token`). Edit set: the design's set header; content a `List` of songs in order with move up/down, the key `Selector` and Remove; end panel with the lineup (`CheckboxList` per member) and the temporary music director. Song in a set: as Version, with the set's key and the person's notes, breadcrumbs Set / song, and "Start in stand mode". The set's details (name, date, time, type), Duplicate and Delete, which the design doesn't show, are a Settings section below the songs, Delete destructive (owner's decision, October 7, 2026). |
| **11–14 Administration** | SPEC-07, R-01.7 | As designed, for admins only (anyone else gets a page not found). The instruments table's "N musicians" comes from a counting function, since admins don't read other people's instruments. |
| **15 Profile** | SPEC-01, 09 | Instruments grouped as in the design: Rhythm (drums, bass), Harmony (keys, guitar, violin), Voice and horns (vocals, saxophone, trumpet, trombone), and Other for the Admin's custom instruments. Notice preferences save on change (T-1003). |
| **Sign-in pages** | SPEC-01 | Not in the design: built with the same Astryx components (sign in, sign up with the terms checkbox, waitlist, password recovery). |
| **Terms and Privacy** | Technical Plan 8, 12.5 | `/terms` and `/privacy` in the reader's language (T-1202), with Astryx typography. |
| **Offline page** (`/offline`) | SPEC-08 | Not in the design. An `EmptyState` saying there is no connection, with a link to the downloaded sets. |
| **Landing (chartdown.app)** | SPEC-01 | Keeps its version 1 design until its own block (T-1307), which redesigns it with the `impeccable` skill so it doesn't look generic. The waitlist, the sign-in links and the Terms and Privacy links stay. |

## 5. Responsive

- **iPad landscape (1180 px) and desktop:** the reference layout, with the side navigation open.
- **iPad portrait and narrower screens:** side panels move below the content; rows of four bars stay.
- **Phone:** out of MVP scope; even so, no screen may break or scroll sideways, and the side navigation becomes a drawer.

## 6. Accessibility

- AA contrast in both modes (the Astryx theme's).
- Real buttons, links and inputs; never clickable elements without a role.
- Every icon-only control has an `aria-label`; the song form announces its state and notes.
- Visible keyboard focus everywhere; tab order top to bottom, start to end.
- Respect reduced-motion preferences.

## 7. Logo and icons

The logo is **concept 3C, "One bar"**: one bar of a chart, two bar lines and four rhythm slashes; the first slash, in red pencil, is the music director's cue that starts the band. The kit lives in `design/logo/` (its guide: `design/logo/guide.pdf`).

- **Versions:** horizontal (symbol + name, the default), stacked (symbol above the name, for square and narrow spaces), symbol alone (app icon, avatar, favicon), and the two-beat **small symbol** for 24 px and below. "App" versions add "App", always secondary to the name.
- **Colors:** ink `#16212C` on light, `#E6EDF3` on dark, for the bar lines, the slashes and the name; red pencil `#B8322A` on light, `#FF8478` on dark, **for the first slash only**. In the app the logo takes them from the theme (the primary text color and the red), so it follows light and dark. Black and white versions for one-color uses.
- **Rules:** clear space of at least half the symbol's height on every side; symbol at least 16 px, horizontal logo at least 96 px wide; never stretched, rotated, all red, shadowed or with slashes added or removed. Red is an accent, never the meaning: the logo reads the same in one color.
- **Where:** the side navigation's header and the landing page show the horizontal logo, with the accessible name "ChartDown"; the favicon (an SVG that follows the browser's light or dark theme, plus ICO), the iPad and Apple touch icons, the web app manifest (192, 512 and maskable 512 px) and the Open Graph image for link previews come from the kit.
- The text in every logo file is converted to outlines (Barlow Condensed Bold, "App" in Medium).

## 8. Sources of truth

- **Design system:** Astryx (`github.com/facebook/astryx`), theme neutral; its CLI for component APIs.
- **Screens:** `design/astryx/` (screens, `SCREENS.md`, prototype).
- **Logo:** `design/logo/`.
- **Language:** ChartDown/Language repository, spec 0.4.
- If code and design disagree, fix the code or update the design first, never just one of them.
