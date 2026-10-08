/** A token that takes a share of a bar: a chord, a rest, a riff, or a note of a riff. */
export interface Timed {
  /** The `:beats` written, or 1 when none is. */
  beats?: number;
  explicitBeats?: boolean;
}

/**
 * Spec 5.1: tokens with `:beats` keep them, and the tokens without share what is left of the
 * bar evenly. Returns each token's share, and the beats the explicit ones use.
 */
export function layoutBeats(
  items: readonly Timed[],
  total: number,
): { shares: number[]; used: number } {
  const fixed = items.filter((item) => item.explicitBeats === true);
  const free = items.filter((item) => item.explicitBeats !== true);
  const used = fixed.reduce((sum, item) => sum + (item.beats ?? 1), 0);
  const left = fixed.length > 0 ? Math.max(total - used, 0) : total;
  const each = free.length > 0 ? left / free.length : 1;
  return {
    shares: items.map((item) => (item.explicitBeats === true ? (item.beats ?? 1) : each)),
    used,
  };
}
