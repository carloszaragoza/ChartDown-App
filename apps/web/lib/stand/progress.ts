// Which bar of the section is playing (R-03.12, T-2804): "Bar 3 of 8" beside the current
// section's name while the metronome plays.
import { copyAt } from "../chart/copies";
import type { TimelineBar } from "../metronome/timeline";

/**
 * The bar playing at a place in the timeline, counted in the bars this pass of its section plays
 * (a repeat's second pass goes on counting; each copy of `@use Bridge 3x` counts afresh), or
 * undefined on a pickup, which is not one of the section's bars.
 */
export function barProgress(
  bars: readonly TimelineBar[],
  at: number,
): { bar: number; of: number } | undefined {
  const here = bars[at];
  if (!here || here.number === 0) return undefined;
  const copy = copyAt(bars, at);
  const same = (index: number) =>
    bars[index]?.section === here.section && copyAt(bars, index) === copy;
  let first = at;
  while (first > 0 && same(first - 1)) first -= 1;
  let last = at;
  while (last < bars.length - 1 && same(last + 1)) last += 1;
  const counted = (from: number, to: number) =>
    bars.slice(from, to + 1).filter((bar) => bar.number > 0).length;
  return { bar: counted(first, at), of: counted(first, last) };
}
