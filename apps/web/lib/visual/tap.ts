// Tap tempo (R-13.2): the beats per minute from the author's taps on the beat.

/** A pause this long between taps starts counting again. */
export const TAP_RESET_MS = 2000;
/** How many of the latest taps are averaged. */
const TAP_WINDOW = 8;

/** The taps kept after a new one at `now` (milliseconds): a long pause starts over. */
export function addTap(taps: readonly number[], now: number): number[] {
  const last = taps.at(-1);
  if (last === undefined || now - last > TAP_RESET_MS || now <= last) return [now];
  return [...taps, now].slice(-TAP_WINDOW);
}

/** The tempo the taps keep, rounded, or null before the second tap. */
export function tapTempo(taps: readonly number[]): number | null {
  if (taps.length < 2) return null;
  const span = (taps.at(-1) as number) - (taps[0] as number);
  return Math.round((60000 * (taps.length - 1)) / span);
}
