# Icon

ChartDown's own icon set: simple stroke drawings on a 24px grid that speed up recognition on an iPad without competing with the chart.

- Drawn for ChartDown: 24×24 viewBox, `stroke-width` 1.75, round caps and joins, no fill (except a `paper` fill to knock out a knob behind a line).
- Color: `ink` on buttons and controls, `ink-muted` when the label is muted. Never `dynamic`. The only icons in `md` are the instrument icons inside an InstrumentTag.
- Size: 20px inside buttons, 24–28px when standing alone.
- **Always with words.** An icon sits next to its text label. An icon-only button is allowed only in tight toolbars, with an `aria-label` and a tooltip.
- Actions: previous, next, view-as, download (offline set), atril (full screen), edit, share, settings, setlist, add.
- Instruments: drums, bass (bass clef), keys, guitar, vocals (microphone), saxophone, trumpet, trombone, violin. Small filled shapes (piano black keys, clef dots) are allowed so they read at 16px.
- Never inside the chart itself: bars, chords and section names stay icon-free.
