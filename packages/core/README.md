# chartdown

The parser for **ChartDown**, a plain-text notation for Nashville Number System charts: sections,
bars, numbers, keys, dynamics and notes for each instrument. It implements the
[ChartDown spec 0.4](https://github.com/ChartDown/Language). It has no runtime dependencies and runs
the same in the browser and in Node.

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

Also exported: `transposeKey`, `keyName` and `parseKeyName` for keys; `sectionLength`; and the
music director's layer format (`parseLayer`, `formatLayer`, `placeLayer`), which keeps a band's
notes apart from the chart.

## License

MIT. The ChartDown spec itself is public domain (CC0).
