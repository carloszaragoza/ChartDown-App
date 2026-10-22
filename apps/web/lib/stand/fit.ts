// The whole song on one screen (R-03.12, T-2823): how small the numbers go so every section fits,
// and the pinch that switches between one section at a time and the whole song.
import type { StandLayout } from "./preferences";

/** The smallest the whole song shrinks its numbers to: below it, the song scrolls instead. */
export const SONG_MIN_SCALE = 0.6;
const STEP = 0.05;

/**
 * The largest number scale, from the chosen size down, at which `fits` says the song fits on the
 * screen; the smallest when it never does, and the page scrolls.
 */
export function fitScale(start: number, fits: (scale: number) => boolean): number {
  for (let scale = start; scale > SONG_MIN_SCALE; scale = Math.round((scale - STEP) * 100) / 100)
    if (fits(scale)) return scale;
  return SONG_MIN_SCALE;
}

/** How far apart two fingers must close or open, as a share of where they began. */
const PINCH_IN = 0.8;
const PINCH_OUT = 1.25;

/** Two fingers closing show the whole song; opening, one section at a time; a small move, nothing. */
export function pinchLayout(ratio: number, layout: StandLayout): StandLayout {
  if (ratio <= PINCH_IN) return "song";
  if (ratio >= PINCH_OUT) return "sections";
  return layout;
}
