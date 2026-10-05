# Bar

One bar of a chart: up to four chords sharing the space, plus optional dynamics and playing marks.

- Chords use `chord-xl` (atril), `chord-md` (desktop) or `chord-sm` (preview), always in `ink`, except the next-section preview, which uses `ink-muted`.
- Bar lines are `bar-line` in `ink`, square corners (`radius-none`). A row starts with a left line, and each bar draws its right line.
- Dynamics sit top-left in `dynamic-mark` and the `dynamic` color.
- Marks: **hold** is a diamond around the chord, **push** a small `‹` before it, **stab** a `^` above. Marks use `dynamic`, never `md`.
- Repeats use a double line (`|:` and `:|`); endings put a label (1., 2.) and a top line on the bar.
- Consumer provides: the parsed bar (chords, beats, marks, dynamic) and the display mode (numbers or letters).
