import type { Bar, Section } from "./types.js";

export interface SectionLength {
  /** Bars played in one pass; equals `total` unless the whole section is one repeat. */
  perPass: number;
  /** Passes of the whole section: more than 1 only when the section is one repeat. */
  times: number;
  /** Every bar played, with repeats and endings unrolled. */
  total: number;
}

const plays = (bar: Bar, pass: number) => bar.ending === undefined || bar.ending.includes(pass);

/**
 * How long a section plays (spec 10). Repeats are unrolled, and each pass plays the bars
 * without an ending plus its own endings, so `|: 6m | 4 | 1 | [1] 5 :| x2` then `[2] 5`
 * is 4 bars, twice.
 */
export function sectionLength(section: Section): SectionLength {
  const bars = section.rows.flatMap((row) => row.bars);
  const passLengths: number[][] = [];
  let total = 0;
  let outside = 0;

  for (let i = 0; i < bars.length;) {
    const end = bars.findIndex((bar, j) => j >= i && bar.repeatEnd !== undefined);
    const start = bars.findIndex((bar, j) => j >= i && bar.repeatStart === true);
    if (end === -1 || (start !== -1 && start > end)) {
      // No repeat from here: count bars up to the next repeat start once each.
      const stop = start === -1 ? bars.length : start === i ? i + 1 : start;
      for (; i < stop; i++) {
        total++;
        outside++;
      }
      continue;
    }
    // A repeat from `from` (its start, or the section's first unread bar) to `end`, plus the
    // endings right after it.
    const from = start !== -1 && start <= end ? start : i;
    for (; i < from; i++) {
      total++;
      outside++;
    }
    let last = end;
    while (bars[last + 1]?.ending !== undefined) last++;
    const times = bars[end]?.repeatEnd?.times ?? 2;
    const lengths: number[] = [];
    for (let pass = 1; pass <= times; pass++) {
      lengths.push(
        bars
          .slice(from, last + 1)
          .filter((bar, k) => (from + k <= end ? plays(bar, pass) : bar.ending?.includes(pass)))
          .length,
      );
    }
    passLengths.push(lengths);
    total += lengths.reduce((sum, n) => sum + n, 0);
    i = last + 1;
  }

  const only = passLengths.length === 1 && outside === 0 ? passLengths[0] : undefined;
  if (only !== undefined && only.every((n) => n === only[0])) {
    return { perPass: only[0] as number, times: only.length, total };
  }
  return { perPass: total, times: 1, total };
}
