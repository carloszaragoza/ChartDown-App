import type { Row, Section } from "chartdown";
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

/**
 * A section reused with a count, drawn as a written repeat (owner's review, October 23, 2026,
 * T-2839): its bars between repeat signs with "×3" at the end, so the count is read where the
 * music is, not only in the heading. A section with a repeat of its own keeps its bars as written.
 */
export function drawnRows(section: Section): Row[] {
  const times = section.use?.times ?? 1;
  const bars = section.rows.flatMap((row) => row.bars);
  if (times <= 1 || bars.length === 0 || bars.some((bar) => bar.repeatStart || bar.repeatEnd))
    return section.rows;
  const last = section.rows.length - 1;
  return section.rows.map((row, index) => ({
    ...row,
    bars: row.bars.map((bar, place) => ({
      ...bar,
      ...(index === 0 && place === 0 ? { repeatStart: true as const } : {}),
      ...(index === last && place === row.bars.length - 1 ? { repeatEnd: { times } } : {}),
    })),
  }));
}
