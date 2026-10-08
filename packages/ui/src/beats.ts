import type { BarItem, Meter } from "chartdown";

/** Columns per beat in a bar's grid: 12 holds halves, thirds and quarters (CHART-VIEWER.md 4). */
export const COLUMNS_PER_BEAT = 12;

export type BeatStrength = "strong" | "semi" | "weak";

/** How strong beat `i` (from 0) of a bar is, by meter (CHART-VIEWER.md 5). */
export function beatStrength(i: number, beats: number, unit: number): BeatStrength {
  if (i === 0) return "strong";
  if (unit === 8 && beats % 3 === 0 && beats > 3) return i % 3 === 0 ? "semi" : "weak";
  if (beats === 4 && i === 2) return "semi";
  if (beats === 6 && unit !== 8 && i === 3) return "semi";
  return "weak";
}

export interface Span {
  /** Grid column where the item starts, from 1. */
  start: number;
  /** Columns it spans. */
  span: number;
}

/**
 * Where each item of a bar sits on its grid (CHART-VIEWER.md 4): items with `:beats` take those
 * beats; the others share what is left equally; with no `:beats`, all share the bar equally.
 */
export function barSpans(items: readonly BarItem[], meter: Meter): Span[] {
  const total = meter.beats;
  // Chords, partial rests (`x:3`) and riffs (`R[ ... ]:2`) can carry `:beats` (spec 5.1).
  const explicit = items.map((item) =>
    (item.type === "chord" || item.type === "no-chord" || item.type === "riff") &&
    item.explicitBeats &&
    item.beats !== undefined
      ? item.beats
      : null,
  );
  const given = explicit.reduce<number>((sum, beats) => sum + (beats ?? 0), 0);
  const open = explicit.filter((beats) => beats === null).length;
  const share = open > 0 ? Math.max(total - given, 0) / open : 0;
  const lengths = explicit.map((beats) => beats ?? share);
  const columns = total * COLUMNS_PER_BEAT;
  let at = 0;
  return lengths.map((length) => {
    const start = Math.min(Math.round(at * COLUMNS_PER_BEAT), columns - 1);
    at += length;
    const end = Math.min(Math.round(at * COLUMNS_PER_BEAT), columns);
    return { start: start + 1, span: Math.max(end - start, 1) };
  });
}
