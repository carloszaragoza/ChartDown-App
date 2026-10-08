# chartdown

The parser for **ChartDown**, a plain-text notation for Nashville Number System charts: sections,
bars, numbers, keys, dynamics and notes for each instrument. It implements the
[ChartDown spec 0.6](https://github.com/ChartDown/Language), and reads charts written for 0.3 to
0.6 without a warning. It has no runtime dependencies and runs the same in the browser and in Node.

```sh
npm install chartdown
```

```ts
import { chordFormatter, parse } from "chartdown";

const chart = parse(`---
key: G
---
## Chorus
> MD: Open it up a little.
> MD drums: Light groove, hi-hat.
{mf} 4 | 1 | 5 | 6m
`);

chart.sections[0]?.name; // "Chorus"
chart.warnings; // [] — problems are reported by line, never thrown

// Numbers, or letters in any key.
const letters = chordFormatter(chart, { style: "letters", key: { root: "A", minor: false } });
```

## The JSON form and the play order

`toJSON(chart)` gives the chart in the JSON form of Appendix A of the spec, so apps, converters
and tests agree on what a chart means. `playOrder(chart)` lists the bars in the order they are
played, after repeats, endings and navigation (D.S., D.C., coda, fine).

```ts
import { parse, playOrder, toJSON } from "chartdown";

const chart = parse("## A\n{segno} 1 | 4 {to coda} | 5 {D.S. al coda}\n## B\n{coda} 6m | 1");
playOrder(chart); // [{ section: 0, bar: 1, pass: 1 }, ...]
toJSON(chart).sections[0]?.rows[0]?.bars[0]?.nav; // ["segno"]
```

Roles in the JSON form are the instrument ids of the catalog you pass in `parse(source, { instruments })`,
and `everyone` for the whole band.

Also exported: `transposeKey`, `keyName` and `parseKeyName` for keys; `sectionLength`; `layoutBeats`
for the share of a bar each token takes; and the music director's layer format (`parseLayer`,
`formatLayer`, `placeLayer`), which keeps a band's notes apart from the chart. See the
[changelog](CHANGELOG.md) for what changed from 0.1.

## License

MIT. The ChartDown spec itself is public domain (CC0).
