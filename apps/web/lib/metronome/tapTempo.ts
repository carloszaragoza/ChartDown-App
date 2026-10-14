/** Taps further apart than this start a new count. */
export const TAP_RESET_MS = 2000;

/**
 * The tempo of a run of taps, in beats per minute (R-11.9): the median of the last four gaps, so
 * one uneven tap doesn't throw it; null until there are two taps in a row.
 */
export function tapTempo(taps: readonly number[]): number | null {
  const run: number[] = [];
  for (const tap of taps) {
    const last = run[run.length - 1];
    if (last !== undefined && tap - last > TAP_RESET_MS) run.length = 0;
    run.push(tap);
  }
  const gaps = run
    .slice(-5)
    .slice(1)
    .map((tap, index) => tap - (run.slice(-5)[index] as number));
  if (gaps.length === 0) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  const median = Number.isInteger(middle)
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[Math.floor(middle)] as number);
  return Math.round(Math.min(300, Math.max(20, 60000 / median)));
}

/** The practice speed that plays a chart written at `written` bpm at `wanted` bpm. */
export function speedFor(wanted: number, written: number): number {
  return wanted / written;
}
