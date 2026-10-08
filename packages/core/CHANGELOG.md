# Changelog

## 0.2.0

The parser now implements [ChartDown 0.6](https://github.com/ChartDown/Language). Charts written for 0.3, 0.4 and 0.5 parse the same, with no version warning.

### New in the language

- **0.5.** Pickup bars (`[p:N]`, bar 0), partial rests (`x:beats`) with the tokens of a bar sharing what is left of it, the sixteenth-note push (`''`) and unison riffs (`R[ ... ]`).
- **0.6.** Meter and tempo changes (`@meter`, `[m:N/D]`, `@tempo`), tempo marks (`{rit}`, `{accel}`, `{a tempo}`), cues and MD notes for one pass of a repeat (`{2x drums: in}`, `> MD 2x bass: ...`), repeat counts written `:| 3x` (`:| x3` still works) and navigation marks (`{segno}`, `{coda}`, `{to coda}`, `{fine}`, D.S. and D.C. jumps) with warnings for an incomplete jump.

### New in the package

- `toJSON(chart)`: the JSON form of Appendix A of the spec, with the play order and the warnings.
- `playOrder(chart)`: the bars in the order they are played, after repeats, endings and navigation.
- `layoutBeats(items, total)`: the share of the bar each token takes (spec 5.1).
- `chordFormatter(...).root(root, row)`: a riff note as a number or a letter, in any key.
- `READABLE_VERSIONS`: the versions a chart may declare without a warning (0.3 to 0.6). `SUPPORTED_VERSION` is now `"0.6"`.
- Layers: a note can be for one pass (`passes`, written `> MD 2x drums: ...`), and a layer counts a pickup as bar 0.
- New warning codes: `bad-meter-directive`, `bad-tempo-directive`, `pickup-and-meter`, `pickup-length`, `pickup-not-first`, `pickup-beats-mismatch`, `riff-note`, `riff-beats-mismatch`, `pass-without-repeat`, `note-pass-without-repeat`, `nav-duplicate`, `nav-second-jump`, `nav-needs-segno`, `nav-needs-coda` and `nav-needs-fine`.

### Changes to watch when upgrading from 0.1

- `Bar.number`, `Cue.passes` and `Note.passes` are always set; `Row.meter` is the meter in effect for the row. Code that builds these objects by hand needs the new fields.
- `Chord.push` is still a boolean; `Chord.shortPush` is set for `''`.
- `BarItem` has a new member, `Riff`, and `NoChord` may carry `beats` and `explicitBeats` (`x:3`).
- `sectionLength` does not count a pickup bar.
- The `unsupported-version` warning's `supported` value is a range such as `0.3–0.6`.
- `@meter` and `@tempo` are directives now; before, they were unknown directives.
- `{fine}`, `{coda}`, `{segno}` and the other navigation marks, and `{rit}`, `{accel}` and `{a tempo}`, are reserved words: a cue with that exact text is now a mark.

## 0.1.0

First release: the parser for ChartDown 0.4, numbers and letters with transposition, instruments from a catalog, the music director's layer format and `sectionLength`.
