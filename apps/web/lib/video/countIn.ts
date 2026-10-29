// The count-in before a recording (R-03.14, T-3023): one bar of clicks at the chart's tempo, then
// the video or the band's audio starts on the bar.
import type { Chart } from "chartdown";
import { clicks, type Click } from "../metronome/engine";
import { barAt, chartClicks } from "./sections";

/** How near a bar's start, in seconds, a recording counts as on it. */
export const NEAR_A_BAR = 0.1;

export interface CountIn {
  /** Where the recording starts, in seconds into it: the start of a bar. */
  at: number;
  /** The count's clicks, from 0, each with its length. */
  clicks: Click[];
  /** How long the count lasts, in seconds. */
  length: number;
}

/**
 * The count before playing from `seconds` into a recording whose first bar falls at `musicStart`:
 * the bar playing there, from its start (before the music, or past its end, the first bar); null
 * when the chart has no tempo.
 */
export function countIn(chart: Chart, seconds: number, musicStart: number): CountIn | null {
  const placed = chartClicks(chart);
  if (!placed) return null;
  // A recording moved to a bar lands a hair before it (a seek is never exact): that bar is the
  // one counted, never the one before (owner's review, October 28, 2026, T-3026).
  const from = barAt(placed.bars, placed.list, seconds + NEAR_A_BAR, musicStart)?.at ?? 0;
  const start = placed.list.find((click) => click.bar === from)?.time ?? 0;
  const counted = clicks(placed.bars, { from, countIn: true }).filter((click) => click.bar === -1);
  const last = counted.at(-1);
  return {
    at: musicStart + start,
    clicks: counted,
    length: last ? last.time + last.duration : 0,
  };
}
