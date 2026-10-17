import type { TimelineBar } from "../metronome/timeline";

/**
 * Which copy of a section reused with a count (`@use Bridge 3x`, ChartDown 0.8) the bar at a place
 * in the timeline belongs to, from 1 (T-2704): the copies play the same bars again, so each time the
 * numbering starts over within the same pass a new copy begins. A repeat's second pass is not a
 * new copy.
 */
export function copyAt(bars: readonly TimelineBar[], at: number): number {
  const bar = bars[at];
  if (!bar) return 1;
  let copy = 1;
  for (let index = at; index > 0; index--) {
    const here = bars[index] as TimelineBar;
    const before = bars[index - 1] as TimelineBar;
    if (before.section !== bar.section) break;
    if (here.number <= before.number && here.pass === before.pass) copy += 1;
  }
  return copy;
}
