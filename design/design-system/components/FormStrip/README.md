# FormStrip

The song map: every section in play order, as chart abbreviations with their length, showing where you are and where your MD notes are waiting.

- **Chip:** the abbreviation in the `num` face (22px, like a printed chart: I, V1, C, B, LC) and the bar count under it in `caption` and `ink-muted`. Repeats read `4×2`.
- **Abbreviations:** Intro I, Verse V1/V2, Pre-chorus PC, Chorus C/C2, Bridge B, Instrumental Inst, Tag T, Last Chorus LC, Outro O. Custom names use their first letters. The full name is in the tooltip and the accessible label.
- **Progress, three states:** played (on `ground`, abbreviation in `ink-muted`), now (inverted: `ink` fill, `ink-inverse` text), coming (on `paper`, `ink`). Never a highlight color.
- **MD marker:** an 8px `md` dot at the top right when that section has notes for the player's instrument (or any notes, for the MD). The accessible label says "has notes for you", so the dot is never the only signal.
- Chips are at least `target-min` tall, `control-border` outline, `radius-sm`, and wrap onto several lines; never scroll sideways.
- Each chip is a real link in an ordered list; the current one has `aria-current="true"`.
