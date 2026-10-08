# ChartDown chart viewer – rendering rules

This is the approved way to draw a ChartDown chart in ChartDown App: in the viewer, the chart editor preview, stand mode and the MD notes editor. It replaces the chart rendering in `design/astryx/reference-code/Chart.tsx`.

## Files

| Path | What it is |
|---|---|
| `CHART-VIEWER.md` | These rules |
| `chart-tokens.css` | Chart tokens, every one mapped to an Astryx theme token |
| `screens/light/` and `screens/dark/` | One screenshot per language feature (01 to 15) and the full page |
| `prototype.html` | The approved visual reference, clickable. Open it in a browser. Its colors and sizes are hard-coded for the demo: **use `chart-tokens.css`, not the prototype's CSS** |

## 1. Principles

1. **The numbers win.** Chords and bar lines are the only full-strength ink.
2. **Time is visible.** Every bar shows its beats, so the length of each chord can be read without labels.
3. **Color always has a second cue** (size, weight, shape or text).
4. **Light and dark themes** come from Astryx; never hard-code colors.

## 2. Type

- Chord numbers use **Barlow Condensed** (self-hosted, OFL license) through `--chart-font-numbers`. It is the only font outside Astryx, kept because condensed numbers fit four chords in one bar on an iPad. Everything else uses Astryx text components.
- Sizes: `--chart-chord-size` in stand mode, one Astryx step smaller in the viewer and editor, `--chart-chord-size-preview` in the next-section preview.
- Quality (`7`, `sus`, `maj7`, `add9`) is a superscript at `--chart-quality-scale`, **in the chord's own face and weight** (Barlow Condensed semibold, never the text face), with **its top on the number's top**, set tight to the number (`0.03em`). It never floats above the number.
- **Minor is always `-` in numbers mode** (Nashville): `2-`, `6-`, `2-7`. Letters mode keeps `m` (`Em7`). Qualities starting with `maj` stay as written.
- A slash bass (`1/3`) is at `--chart-bass-scale`, also in the chord's face.

## 3. The bar

Each bar is a box with a right bar line (`--chart-bar-line`); the first bar of a row also has a left bar line. A row of the source is a row on screen, with as many columns as it has bars.

**Spacing inside a bar** (so a row breathes and a number never touches a line):

| Where | Token | Size |
|---|---|---|
| Bar line to the chords, both sides | `--chart-cell-padding` | `--spacing-4` (16px) |
| A split's dashed line to the next chord | – | `--spacing-2` (8px) |
| Top of the bar to the chord (tags line included) | – | about 22px |
| Chord to its beat slashes | – | `--spacing-1` + `--spacing-0-5` (6px) |
| Beat slashes to the bottom of the bar | `--chart-bar-padding-end` | `--spacing-4` (20px with the line gap) |

Inside, a bar has three layers, top to bottom:

1. **Tags line:** ending label (`1.`), dynamic (`mf`, italic, `--chart-dynamic`), cues (instrument name in `--chart-md`), and `×N` on the last bar of a repeat.
2. **Chord line:** the chords, laid out on the beat grid (section 4).
3. **Beat line:** one slash `/` per beat (section 5).

A lyric landmark sits under the beat line, italic, `--chart-ink-muted`, truncated with an ellipsis.

## 4. Splitting a bar between chords

The bar is a CSS grid of `beats × 12` columns (12 columns per beat handles halves, thirds and quarters).

- Each chord starts at its own beat and spans its length: `grid-column: <start> / span <beats × 12>`.
- **Even split** (no `:beats`): chords share the bar equally.
- **Uneven split:** use the `:beats` values. If only some chords have `:beats`, the rest share what's left.
- The chord text is **left-aligned at the start of its span**, so it sits above the slash of the beat where it begins.
- Every chord after the first has a dashed line on its left (`--chart-split-line`) where the change happens.
- **Don't print the length** ("2 beats"). The slashes and the dashed line already show it.

Example: `4:2 4:1 5:1` in 4/4 → the first 4 spans slashes 1–2, the second 4 starts at slash 3, the 5 at slash 4.

## 5. Beat strength

One slash per beat, aligned to the grid. Each slash has one of three levels, drawn with color, size and weight from `chart-tokens.css`:

| Meter | Strong | Semi-strong | Weak |
|---|---|---|---|
| 2/4 | 1 | – | 2 |
| 3/4 | 1 | – | 2, 3 |
| 4/4 | 1 | 3 | 2, 4 |
| 6/4 | 1 | 4 | the rest |
| 6/8, 9/8, 12/8 | 1 | first of every other group of three (4; 4 and 7; 4, 7 and 10) | the rest |
| Any other | 1 | – | the rest |

```ts
function beatStrength(i: number, beats: number, unit: number): 'strong' | 'semi' | 'weak' {
  if (i === 0) return 'strong';
  if (unit === 8 && beats % 3 === 0 && beats > 3) return i % 3 === 0 ? 'semi' : 'weak';
  if (beats === 4 && i === 2) return 'semi';
  if (beats === 6 && unit !== 8 && i === 3) return 'semi';
  return 'weak';
}
```

Each slash gets an accessible title, for example "Beat 3: semi-strong". Slashes are decorative for screen readers (`aria-hidden`) because the chord list is read in order.

## 6. Marks on a chord

| Source | Meaning | Drawing |
|---|---|---|
| `<5>` | **Hold:** play once and let it ring for its whole length. Optional. | The chord sits **centered inside a square box** of `--chart-hold-box`; behind it, a square of `--chart-hold-diamond` rotated 45° with `--chart-hold-stroke`, centered on the same box. The box keeps the chord on the same baseline as the other chords. |
| `'4` | Push (play early) | Small `‹` before the chord, `--chart-dynamic` |
| `1!` | Stab | `^` above the chord, `--chart-dynamic` |
| `1~` | Fermata | `𝄐` above the chord, `--chart-dynamic` |
| `x` | No chord | "N.C." in `--chart-ink-muted` |
| `%` | Repeat the previous bar | `%` in `--chart-ink-muted` |
| `=` | Keep the previous chord ringing | A tie mark in `--chart-ink-muted` |

## 7. Sections, notes and form

- Section name: Astryx `Heading` (level 3 or 4) with the bar count in secondary text.
- MD notes come **before** the bars: the word "MD" in `--chart-md`, or an instrument `Token` (`color="red"`) for instrument notes. Plain `>` notes in secondary text.
- Filter notes by the viewer's instruments as in SPEC-06 (on the server for band layers).
- Repeats: double bar line (`--chart-repeat-line`) at the start and end; `×N` on the tags line of the last bar. Endings: label and a top line over the ending bars.
- Key changes: a "Key change: A" line in `--chart-dynamic` above the row.

## 8. Numbers, letters and transposing

Follow ChartDown spec section 12 (`@chartdown/core`): numbers by default, letters on demand, transposition moves key changes too, flats in F, Bb, Eb, Ab, Db and Gb.

## 9. Responsive

- Bars never shrink below `--chart-bar-min-width`. If a row doesn't fit, the **row scrolls sideways inside its own container**; the page never does.
- In stand mode on iPad landscape, rows of 4 bars fit without scrolling.

## 10. Acceptance checks

- `4:2 4:1 5:1` in 4/4: the second 4 starts at the third slash; there's no "beats" text.
- A 3/4 bar shows one strong slash and two weak ones; a 4/4 bar shows strong, weak, semi-strong, weak.
- A 6/8 bar shows six slashes with strong on 1 and semi-strong on 4.
- `<5>` is centered inside its diamond, on the same baseline as the chords around it.
- Switching the app to dark mode changes every chart color with no code change.
- Each screenshot in `screens/` matches the app's rendering of the same source text.
