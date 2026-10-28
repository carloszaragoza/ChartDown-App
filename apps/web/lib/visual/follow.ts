// The bar a playing video or band recording is on, for one row of the visual editor (R-13.15).
import type { VideoClock } from "../video/clock";
import { barAt, type chartClicks } from "../video/sections";

export type Placed = ReturnType<typeof chartClicks>;

/**
 * The played bar when it is in this row, as `index:progress:downbeat`, or "" (a string, so a row
 * the music isn't in never renders again as it plays).
 */
export function playedIn(
  placed: Placed,
  clock: VideoClock | null,
  section: number,
  row: number,
): string {
  if (!clock?.playing || !placed) return "";
  const bar = barAt(placed.bars, placed.list, clock.time, clock.musicStart);
  return bar && bar.section === section && bar.row === row
    ? `${bar.index}:${bar.progress}:${bar.downbeat ? 1 : 0}`
    : "";
}
