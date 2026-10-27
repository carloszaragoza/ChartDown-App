// Importing a chart written in ChartDown into the visual editor (R-13.17).
import { parse, type Warning } from "chartdown";
import { isKnownToken, tokens, visualChart, type VisualChart } from "./model";

/** The largest file imported, in bytes. */
export const MAX_IMPORT_BYTES = 1024 * 1024;
// How many of a text's chords are checked to tell ChartDown from a chord sheet, and how many of
// them must read as ChartDown.
const SAMPLE = 400;
const KNOWN_SHARE = 0.8;

export type ImportResult =
  | { kind: "chart"; chart: VisualChart }
  | { kind: "warnings"; warnings: Warning[] }
  | { kind: "notChartDown" }
  | { kind: "empty" };

/**
 * What a file or a pasted text holds: a chart to import, a ChartDown chart with warnings, or
 * something that isn't ChartDown, told by its bars' chords (a chord sheet's lyrics don't read).
 */
export function readImport(text: string): ImportResult {
  if (text.trim() === "") return { kind: "empty" };
  if (text.includes("\u0000")) return { kind: "notChartDown" };
  const chart = visualChart(text);
  const sample = chart.sections
    .flatMap((section) => section.bars.flatMap((bar) => tokens(bar.chords)))
    .slice(0, SAMPLE);
  if (sample.length === 0) return { kind: "notChartDown" };
  const known = sample.filter(isKnownToken).length;
  if (known / sample.length < KNOWN_SHARE) return { kind: "notChartDown" };
  const { warnings } = parse(text);
  if (warnings.length > 0) return { kind: "warnings", warnings };
  return { kind: "chart", chart };
}
