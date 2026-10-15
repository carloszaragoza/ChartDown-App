import { chordFormatter, parse, type Chart, type ChordStyle } from "chartdown";

/** One chord as a chart draws it: the root, a quality mark and a slash bass. */
export interface DemoChord {
  root: string;
  /** Numbers draw a minor as a raised "-"; letters keep the "m". */
  mark: string;
  bass: string;
}
export interface DemoBar {
  chords: DemoChord[];
  dynamic: string | null;
  lyric: string | null;
}
export interface DemoSection {
  name: string;
  short: string;
  note: string;
  length: number;
  bars: DemoBar[];
}

/** A section's first row, in numbers or letters and in a key, drawn by the parser (T-1310). */
export function demoSections(
  source: string,
  style: ChordStyle = "numbers",
  key?: string,
): DemoSection[] {
  const chart: Chart = parse(source);
  const formatter = chordFormatter(chart, {
    style,
    ...(key ? { key: { root: key, minor: false } } : {}),
  });
  return chart.sections.map((section) => {
    const row = section.rows[0];
    const bars = (row?.bars ?? []).map((bar) => ({
      dynamic: (bar as { dynamic?: string }).dynamic ?? null,
      lyric: bar.lyric ?? null,
      chords: bar.items.flatMap((item) => {
        if (item.type !== "chord" || !row) return [];
        const chord = formatter.chord(item, row);
        const minor = chord.quality === "m";
        return [
          {
            root: chord.root,
            mark:
              style === "numbers" ? (minor ? "-" : (chord.quality ?? "")) : (chord.quality ?? ""),
            bass: chord.bass ?? "",
          },
        ];
      }),
    }));
    const words = section.name.split(/\s+/);
    return {
      name: section.name,
      short: words.map((word) => (/^\d+$/.test(word) ? word : word[0])).join(""),
      note: section.notes[0]?.text ?? "",
      length: section.rows.reduce((total, r) => total + r.bars.length, 0),
      bars,
    };
  });
}
