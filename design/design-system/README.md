# ChartDown – Papel y tinta

The visual system for **ChartDown App**: band charts that read like ink on paper, where the numbers come first.

## Principles

1. **The numbers win.** Chords and bar lines are the only things drawn in `ink` at full strength. Everything else steps back in `ink-muted`.
2. **Color means something, or it isn't there.** Two pencils, no more: **red** (`md`) is the music director, **blue** (`dynamic`) is how loud. No yellow, amber or bright accents: they pull the eye away from the chart. Errors use words and icons, not a third color.
3. **Never color alone.** Every MD note carries the word **MD** or the instrument name; every dynamic is text (*mf*, *cresc.*). A chart must read fully in grayscale.
4. **Same chart, two lights.** *Papel* (light) for rehearsal and planning, *Escenario* (dark) for dim stages. Same layout and sizes; only the color tokens change.
5. **Printed-chart honesty.** Bars are square (`radius-none`), lines are solid ink, no shadows or gradients.

## Logo

The ChartDown mark is **one circle split by the stem of the D**: the left half is the C, the right half is the D, and two red-pencil dots beside the stem turn it into a **repeat sign**. People often read it as a friendly face leaning right, and that warmth is welcome.

- **Colors:** `ink` with `md` dots on light grounds; the dark-theme `ink` and `md` on `Escenario`. A one-color version exists for stamps and single-ink printing.
- **Clear space:** at least half the symbol's height on every side.
- **Minimum size:** 16px for the symbol, 96px wide for the full logo.
- **Name:** Barlow Condensed Bold, converted to outlines in the files. In "ChartDown App", the word "App" is SemiBold in `ink-muted`.
- **Never:** stretch, rotate, outline, add shadows, or recolor the dots outside the red pencil.
- Files: see the **Logos** asset group.

## Color

| Token | Use it for | Never for |
|---|---|---|
| `ink` | Chord numbers, bar lines, titles, main text | Large backgrounds (except the current-section chip and primary button) |
| `ink-muted` | Meta, captions, next-section preview, labels | Chords in the current section |
| `ink-inverse` | Text on an `ink` fill | Anything else |
| `paper` | Cards, top bar, chart sheet | Text |
| `ground` | Page background | Text |
| `rule` | Decorative hairlines and card outlines | The only boundary of a button or input |
| `control-border` | Borders of buttons, chips, inputs (3:1) | Bar lines |
| `md` | The MD label, instrument tags, instrument cues | Errors, decoration, links |
| `dynamic` | Dynamics, links, focus ring | MD notes |

### Accessibility check

All text meets WCAG AA (4.5:1) on `paper` in both themes: `ink` 15.9 / 13.8, `ink-muted` 5.8 / 6.7, `md` 5.8 / 6.9, `dynamic` 7.5 / 7.1 (light / dark). `control-border` reaches 3.4:1 for controls. In simulations of protanopia, deuteranopia and tritanopia, `md` and `dynamic` stay clearly distinct, and since neither carries meaning by color alone, the chart stays fully readable.

## Typography

- **Barlow Condensed** (`num`) for everything musical: chords, song and section titles. Condensed so four chords fit in one bar at stand-reading size.
- **Source Sans 3** (`ui`) for everything else: MD notes, buttons, meta.
- Both are Google Fonts. Fallbacks: Arial Narrow; Segoe UI / system-ui.
- Minimum on iPad: `caption` (14px). MD notes use `note` (18px) so they read from a music stand.
- Minor chords in numbers mode: the minus is a raised mark at about half size (6⁻). In letters mode, `m` (Em).

## Layout

- A row shows **4 bars** by default; a row in the source is a row on screen.
- The current section uses `bar-height` (128px) and `chord-xl`; the next section is a quiet strip at `bar-height-sm` with `chord-sm` in `ink-muted`.
- Page padding `space-10`, section card padding `space-6`, gaps of `space-4` to `space-6` between blocks.
- Everything tappable is at least `target-min` (44px).

## Voice

- UI copy is English by default with full Spanish; the chart syntax never translates.
- MD notes are short and imperative: "Open it up a little." "Out on the first pass."
- No exclamation marks, no emoji.

## Iconography

ChartDown has its own small set of stroke icons (see the **Icon** component): a 24px grid, 1.75px lines, round caps, drawn in `ink` or `ink-muted`.

- Icons speed up recognition on a music stand; they never replace words. Every icon sits beside its label, or carries an `aria-label` in tight toolbars.
- Icons live on controls (buttons, menus, toolbars), never inside the chart: bars, chords and section names stay icon-free.
- Action icons never use `md` or `dynamic`, so they are never mistaken for MD notes or dynamics. Instrument icons are the exception: they live inside the red-pencil InstrumentTag and take its `md` color.

## Components

- **Bar** — one bar with chords, dynamics and marks (hold, push, stab).
- **Section** — a section card: title, bar count, MD notes and its rows of bars.
- **MDNote** — a music director note for everyone or for one instrument.
- **InstrumentTag** — the red-pencil label naming who a note is for: icon and name, or icon only in tight spaces.
- **Button** — primary, secondary and the "View as" instrument selector, with icons beside the text.
- **FormStrip** — the song map: chart abbreviations, bar counts, progress (played, now, coming) and a red dot where your MD notes are.
- **Icon** — the ChartDown stroke icon set.

## Rights

Examples in this system use original sample songs. Never place full song lyrics in the UI or examples; lyric landmarks are 8 words at most.
