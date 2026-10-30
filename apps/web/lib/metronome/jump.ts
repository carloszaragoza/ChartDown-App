import type { TimelineBar } from "./timeline";

/**
 * Where a tap on a bar takes the playing metronome (R-11.18, T-3033), as its place in the play
 * order: in the section playing, that bar in the pass and repeat playing; in another section,
 * its next time ahead, or its last time behind when it doesn't come again. Null for a bar the
 * play order never reaches.
 */
export function jumpTarget(
  bars: readonly Pick<TimelineBar, "section" | "number" | "pass">[],
  section: number,
  number: number,
  at: number,
): number | null {
  const matches = bars.flatMap((bar, place) =>
    bar.section === section && bar.number === number ? [place] : [],
  );
  if (matches.length === 0) return null;
  const now = bars[at];
  if (now?.section === section) {
    // The run of the section playing: from where it began to where it ends.
    let first = at;
    while (first > 0 && bars[first - 1]?.section === section) first -= 1;
    let last = at;
    while (last < bars.length - 1 && bars[last + 1]?.section === section) last += 1;
    const run = matches.filter((place) => place >= first && place <= last);
    const samePass = run.find((place) => bars[place]?.pass === now.pass);
    if (samePass !== undefined) return samePass;
    if (run.length > 0) return run[0] ?? null;
  }
  return matches.find((place) => place > at) ?? matches[matches.length - 1] ?? null;
}
