// The adapter the official ChartDown conformance suite runs against (spec Appendix B; R-00.12).
// `node conformance/run.mjs <adapter>` calls toJSON for every case and display for the cases of
// spec 12, as the suite's README describes.
import { chordFormatter, keyName, parseKeyName } from "./display.js";
import { toJSON as jsonForm, type ChartJson } from "./json.js";
import { parse } from "./parse.js";
import type { BarItem, Row } from "./types.js";

/** The JSON form of a chart (spec Appendix A). */
export function toJSON(source: string): ChartJson {
  return jsonForm(parse(source));
}

/** What a display case asks for: numbers or letters, and the key to show the chart in. */
export interface DisplayCase {
  style: "numbers" | "letters";
  key?: string;
}

/** The chords as shown (spec 12): the home key, each row's key, and each row as text. */
export interface Shown {
  homeKey: string;
  keys: string[];
  rows: string[];
}

const WRITTEN: Partial<Record<BarItem["type"], string>> = {
  "no-chord": "x",
  "repeat-bar": "%",
  tie: "=",
};

/** The chords of a chart as shown in a style and key, in the suite's text form. */
export function display(source: string, options: DisplayCase): Shown {
  const chart = parse(source);
  const key = options.key === undefined ? undefined : parseKeyName(options.key);
  const formatter = chordFormatter(
    chart,
    key === undefined ? { style: options.style } : { style: options.style, key },
  );
  const rows: Row[] = chart.sections.flatMap((section) => section.rows);
  const item = (shown: BarItem, row: Row): string => {
    if (shown.type === "chord") return formatter.chord(shown, row).text;
    if (shown.type === "riff") {
      const notes = shown.notes.map((note) =>
        note.type === "rest" ? "x" : formatter.root(note.root, row),
      );
      return `R[ ${notes.join(" ")} ]`;
    }
    return WRITTEN[shown.type] ?? "";
  };
  return {
    homeKey: keyName(formatter.homeKey),
    keys: rows.map((row) => keyName(formatter.rowKey(row))),
    rows: rows.map((row) =>
      row.bars.map((bar) => bar.items.map((shown) => item(shown, row)).join(" ")).join(" | "),
    ),
  };
}
