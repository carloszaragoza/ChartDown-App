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

Inside, a bar has up to three layers, top to bottom:

1. **Tags line:** ending label (`1.`), dynamic (`mf`, italic, `--chart-dynamic`), cues (instrument name in `--chart-md`), and `×N` on the last bar of a repeat.
2. **Chord line:** the chords, laid out on the beat grid (section 4).
3. **Beat line:** the beat marks (section 5), only in a bar that shows them. A bar without marks has no beat line, and neither has a row where no bar shows them.

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

## 5. Beat marks

The slashes under the chords are a way of **viewing** a chart, like numbers or letters (R-03.7): they change nothing in the source, the parser, the beat checks, the warnings or the JSON form.

**The control "Beats"** has three options and sits with Key and View in the viewer, stand mode and a set's song:

- **Off:** no bar shows marks.
- **Auto** (the default): a bar shows marks only where they tell something (below).
- **Always:** every bar shows marks, except one that is only `%`, which already says "as the one before".

The choice is in the address (`?beats=off` or `?beats=always`; Auto is left out, like the other defaults) and the browser remembers the last one it was given (`localStorage`, always inside a `try`/`catch`; with nothing stored it is Auto). A view with no bar grid, such as "MD cues only", disables it, as Key is disabled in numbers mode. A printed chart follows the mode that is on. The control's accessible name is "Beat slashes".

### When Auto shows marks

A bar shows marks if it meets at least one of these:

| Condition | Example |
|---|---|
| A token has an explicit `:beats` | `1:3 4:1` |
| A chord does not start on a beat (in 6/8, 9/8 and 12/8 a beat is a group of three eighths) | `1 4 5` in 4/4, `1 4` in 3/4 |
| It has a push | `'4`, `''1` |
| It has a partial rest (an `x` beside other tokens, or `x:beats`) | `1! x:3` |
| It has a riff | `R[ 1 3 4 5 ]` |
| It is a pickup | `[p:2] 5` |
| It has a meter of its own | `[m:2/4] 5` |
| It is the first bar after an `@meter`, so the new count is seen | the first bar of a row with a meter change |

A bar does **not** show marks in Auto when it is:

- one chord for the whole bar: `1`, `<1>`, `1~`;
- an even split whose chords all start on a beat: `1 4` in 4/4, `6m 5 4 1` in 4/4, `1 4` in 6/8 (two big beats);
- only `%`, `=` or `x`.

### A bar with marks

- **One slash per mark**, placed in proportion to the bar's width: the mark at position `p` of a bar of `L` beats sits at `p / L` of its width. Strong marks are bolder: the 1 always, and the 3 in 4/4; the others are finer and in a quieter color (section "Strength").
- **Chords start at their beat**, not centered: at the sum of the beats of the tokens before them. A chord with fractional beats (`1:1.5 4:2.5`) starts between two slashes, at its exact place; the slashes stay on the beats.
- **A thin dotted line** where each chord starts, except the first, so it is never taken for a bar line.
- **A push** draws the chord slightly ahead of its slash, with `‹` or `‹‹`; the slash stays on the beat, so the chord is seen to come early.
- **A rest** (`x`, `x:3`) dims the slashes of the beats it covers, so they can still be counted.
- **A riff** puts each note on its own beat.

### A bar without marks

It has no beat line and no dotted lines: its chords are spread evenly across the bar, centered, as they are on a printed chart. A row where no bar shows marks has no beat line at all, so its bars stay compact. In a row where some bars show marks and others do not, the beat line is shared by the row, so every chord stays on one baseline.

### Marks by meter

| Meter | Marks |
|---|---|
| Simple: 2/4, 3/4, 4/4, 5/4, 6/4, 3/2 | One slash per beat of the top number |
| Compound: 6/8, 9/8, 12/8 (a top number that is a multiple of 3 above 3, over 8) | One slash per **big beat**: 2, 3 or 4. The eighths inside get no mark; six equal slashes are never drawn |
| Irregular: 3/8, 5/8, 7/8 | One slash per eighth, the 1 strong |
| A pickup `[p:N]` | Only the marks that fall in its last `N` beats, in the narrow bar |
| `[m:N/D]` and `@meter` | The meter in force for that bar |

### Strength

Each slash has one of three levels, drawn with color, size and weight from `chart-tokens.css`:

| Meter | Strong | Semi-strong | Weak |
|---|---|---|---|
| 2/4 | 1 | – | 2 |
| 3/4 | 1 | – | 2, 3 |
| 4/4 | 1 | 3 | 2, 4 |
| 6/4 | 1 | 4 | the rest |
| 6/8, 9/8, 12/8 | the first big beat | every other big beat | – |
| Any other | 1 | – | the rest |

Each slash gets an accessible title, for example "Beat 3: semi-strong". Slashes, dotted lines and dimmed slashes are decorative for screen readers (`aria-hidden`) because the chord list is read in order. Strong and weak slashes keep their contrast in light and dark.

## 6. Marks on a chord

| Source | Meaning | Drawing |
|---|---|---|
| `<5>` | **Hold:** play once and let it ring for its whole length. Optional. | The chord sits **centered inside a square box** of `--chart-hold-box`; behind it, a square of `--chart-hold-diamond` rotated 45° with `--chart-hold-stroke`, centered on the same box. The box keeps the chord on the same baseline as the other chords. |
| `'4` | Push (play early) | Small `‹` before the chord, `--chart-dynamic`; in a bar with marks the chord also sits slightly ahead of its slash (section 5) |
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

## 10. ChartDown 0.5 and 0.6 elements

Drawn after the reference playground of the Language repository (its "Syntax tour" and "Northbound"), in this system's tokens. Proposed October 8, 2026 (T-1706) for the owner's review. Every element says what it is in words; none relies on color alone.

| Source | Drawing |
|---|---|
| `[p:N]` pickup | A **narrower bar**: its width is `N` over the meter's top number of a full bar, never under `--chart-pickup-min` (0.3). Same bar lines; `N` beat slashes; chords on the same baseline. It is bar 0 and is not counted: the section's count reads "pickup + 4 bars". |
| `x:3` | "N.C." in `--chart-ink-muted`, spanning its beats on the grid like a chord (section 4). |
| `R[ 1 3 4 #4 5 ]` | The **notes** in the chord face and weight, side by side and sharing the riff's beats (or their own `:beats`), in numbers or letters like the chords. One **line under the whole riff** (`--chart-riff-line`, `--chart-dynamic`). A rest is "x" in `--chart-ink-muted`. Read out as "Unison riff". |
| `''4` | `‹‹` before the chord, `--chart-dynamic`; `'4` stays `‹`. Read out as "short push". |
| `[m:2/4]` | The meter in the tags line, small italic, `--chart-dynamic`; the bar's slashes follow its own meter. |
| `@meter 6/8`, `@tempo 72` | A line above the row, like a key change, in `--chart-dynamic`: "Meter: 6/8 · Tempo: 72 bpm". |
| `{rit}` `{accel}` `{a tempo}` | In the tags line, small italic, `--chart-dynamic`: "rit.", "accel.", "a tempo". |
| `{segno}` `{coda}` `{to coda}` `{fine}` `{D.S.}` `{D.C.}` and "al coda" and "al fine" | A **chip in the tags line**: the word (Segno, Coda, To Coda, Fine, D.S. al Coda...) in bold, `--chart-ink`, in a thin border (`--chart-nav-border`) with a small radius. The words are the musical terms, the same in every language. |
| `{2x drums: in}`, `{1x,3x: stop}` | The cue with a bold prefix in `--chart-md`: "2x Drums", "1x,3x" when it is for everyone. |
| `> MD 2x drums: ...` | A red `Token` "2x" before the instrument `Token`s of the note. |
| A song with a D.S. or D.C. jump | Under the song form, a line "Play order" with the sections in the order they are played, with the bars when only part of a section plays: "Intro → Verse → Chorus → Bridge → Verse → Chorus (bars 1–7) → Outro". |

Screenshots for review, from `/design/chart-0-6` (development and preview builds): `screens/light` and `screens/dark`, `chart-0-6-northbound-1.png`, `chart-0-6-northbound-2.png` and `chart-0-6-syntax-tour.png`.

**Acceptance checks**

- `[p:2] 5 | 1 | 4 | 5 | 1` in 4/4: the first bar is about half as wide as the others, with two slashes, and the section reads "pickup + 4 bars".
- `1! x:3`: the 1 on the first slash and "N.C." across the other three.
- `R[ 5:1 b7:1 x:2 ]`: three marks on one underline, the rest muted, the 5 and the b7 one beat each.
- `[m:2/4]` in a 4/4 row: the tag "2/4" and two slashes in that bar.
- Northbound's Bridge: a "Meter: 6/8 · Tempo: 72 bpm" line, then "rit." on its last bar, then "Meter: 4/4 · Tempo: 84 bpm"; the Verse's last bar, "D.S. al Coda"; the Outro's first bar, "Coda".
- Light and dark change every color with no code change.

## 11. Acceptance checks

**Beats (R-03.7)**

- With Off, no bar has a beat line, and the chart reads like a printed one.
- With Auto, a bar of one chord, `1 | 4 | 5`, and `6m 5 4 1` in one bar of 4/4 show no marks.
- With Auto, `1:3 4:1` shows four slashes and the 4 starts at the fourth.
- With Auto, `1! x:3` shows the first slash as usual and the other three dimmed.
- With Always, a bar of Lantern Bay (6/8) shows two big-beat slashes, not six; a `%` bar shows none.
- A pickup `[p:2]` shows two slashes in its narrow bar.
- With `'4`, the chord sits slightly ahead of its slash.
- The Beats control is disabled in a view with no bar grid; changing it changes no beat check, warning or JSON.
- Light and dark keep the contrast of strong and weak slashes.

**The rest**

- `4:2 4:1 5:1` in 4/4: the second 4 starts at the third slash; there's no "beats" text.
- A 3/4 bar shows one strong slash and two weak ones; a 4/4 bar shows strong, weak, semi-strong, weak.
- A 6/8 bar with marks shows two slashes, the first strong and the second semi-strong; 9/8 shows three and 12/8 four.
- `<5>` is centered inside its diamond, on the same baseline as the chords around it.
- Switching the app to dark mode changes every chart color with no code change.
- Each screenshot in `screens/` matches the app's rendering of the same source text.
