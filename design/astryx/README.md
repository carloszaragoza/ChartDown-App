# ChartDown App – Design system and screens (Astryx)

This folder is the **approved UI design** for ChartDown App. It replaces the earlier "Papel y tinta" screen designs. Put it in the repository at `design/astryx/`.

## What's here

| Path | What it is |
|---|---|
| `screens/light/` | A screenshot of every screen and tab, light mode (1280 px wide, full page) |
| `screens/dark/` | The same screens in dark mode |
| `SCREENS.md` | One section per screen: purpose, specs it implements, Astryx components, states and interactions |
| `reference-code/` | The prototype source (`App.tsx`, `Chart.tsx`, `InstrumentIcons.tsx`, `main.tsx`) and its dependencies |
| `prototype.html` | The clickable prototype in one file. Open it in a browser |

## Design system: Astryx

- **Library:** `@astryxdesign/core` with the `@astryxdesign/theme-neutral` theme, React 19, icons from `@heroicons/react`.
- **Theme mode:** follows the system (light or dark). Every screen must work in both.
- **Use Astryx components for everything** they cover: `AppShell`, `SideNav`, `Layout` (+ `LayoutHeader`, `LayoutContent`, `LayoutPanel`), `List`/`Item`, `Table`, `TabList`/`Tab`, `Card`, `Section`, `Button`, `TextInput`, `TextArea`, `Selector`, `RadioList`, `CheckboxList`, `Switch`, `SegmentedControl`, `DateInput`, `TimeInput`, `Token`, `Badge`, `StatusDot`, `Avatar`, `Banner`, `EmptyState`, `Breadcrumbs`, `Heading`, `Text`, `Icon`.
- **Before using a component, check its API** with the Astryx CLI (`npx astryx component <Name> --dense`) instead of guessing props.
- **No raw colors, pixel sizes or custom CSS.** Use Astryx props and theme tokens (`var(--color-*)`, `var(--spacing-*)`, `var(--border-width)`). The only custom visuals are the two chart components below.

## Custom components (not in Astryx)

These live in `reference-code/` and become shared components in `packages/ui`:

- **`BarRow`** (`Chart.tsx`): a row of bars of a ChartDown chart. Square bar lines, chord numbers in large tabular figures, minor and quality marks as superscripts, dynamics in the accent color. A `size="sm"` variant is used for the next-section preview. In the app it must render the tree from `@chartdown/core`, not the simple preview parser in the prototype.
- **`MDNotes`**: MD notes as a red `Token` (the word "MD" or the instrument) followed by the note text.
- **Instrument icons** (`InstrumentIcons.tsx`): drums, bass, keys, guitar, vocals, saxophone, trumpet, trombone, violin. Stroke icons on a 24 px grid; shown in the error/red color only inside instrument contexts.

## Rules that still apply

- **Color means something:** red (`color="red"` tokens, error color) = music director and instruments; never decoration. Accent/blue = dynamics, links, selection.
- **Never color alone:** every MD note says "MD" or the instrument name; every status dot has a visible text label next to it.
- **Touch targets:** use Astryx default sizes on iPad; never shrink interactive controls below their default.
- **No lyrics:** sample data in code and tests uses original songs only.
- **Logo:** a new logo is coming. Until then, the side nav shows the text "ChartDown"; don't add the old mark.

## Sample data

Names, songs and emails in the screenshots are examples. "Open Road", "Lantern Bay" and the other songs are original example songs. Emails use `example.com`.
