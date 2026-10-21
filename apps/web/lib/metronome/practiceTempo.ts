/** The tempo stepper's range, in beats per minute (T-2808). */
export const TEMPO_MIN = 30;
export const TEMPO_MAX = 240;

/** A tempo to a tenth of a beat per minute, as a chart may write it (tempo: 85.5). */
export function roundTempo(bpm: number): number {
  return Math.round(bpm * 10) / 10;
}

/** A practice tempo kept within the stepper's range, to a tenth of a beat per minute. */
export function clampTempo(bpm: number): number {
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, roundTempo(bpm)));
}

/** The tempo the metronome plays a chart written at `written` bpm at a speed in percent (R-11.9). */
export function practiceTempo(written: number, speed: number): number {
  return roundTempo((written * speed) / 100);
}

/** The practice speed, in percent, that plays a chart written at `written` bpm at `bpm`. */
export function speedForTempo(bpm: number, written: number): number {
  return (clampTempo(bpm) / written) * 100;
}
