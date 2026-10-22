/**
 * Where the music starts and ends in a version's video or a band's recording (R-03.11, R-06.7),
 * in milliseconds, as they are saved; the end is optional (T-2830).
 */
export interface MusicPoints {
  startMs: number;
  endMs: number | null;
}

const HOUR = 3_600_000;

/** The points rounded and checked: within an hour, the end after the start; null otherwise. */
export function checkedPoints(points: MusicPoints): MusicPoints | null {
  const startMs = Math.round(points.startMs);
  const endMs = points.endMs === null ? null : Math.round(points.endMs);
  if (!Number.isFinite(startMs) || startMs < 0 || startMs > HOUR) return null;
  if (endMs !== null && (!Number.isFinite(endMs) || endMs <= startMs || endMs > HOUR)) return null;
  return { startMs, endMs };
}
