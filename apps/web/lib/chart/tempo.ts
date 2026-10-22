// A tempo as people read it (ChartDown 0.9, R-11.5, R-11.16): the number as written, and the
// unit in words when one is written, or that it is still to confirm.
import { readTempo, type BeatUnit } from "chartdown";

/** The words for a unit, or for `?`, in the reader's language. */
export type UnitWords = (unit: BeatUnit | "?") => string;

/** "58, dotted quarter", "58, unit to confirm" or "72"; the text as written if it has no number. */
export function tempoLabel(text: string, words: UnitWords): string {
  const tempo = readTempo(text);
  if (!tempo) return text.trim();
  const number = String(tempo.bpm);
  if (tempo.unconfirmed) return `${number}, ${words("?")}`;
  return tempo.unit ? `${number}, ${words(tempo.unit)}` : number;
}

/** The message key of a unit's words, under `chart.beatUnit`: `q.` is `qDotted`, `?` `unconfirmed`. */
export function unitKey(unit: BeatUnit | "?"): string {
  return unit === "?" ? "unconfirmed" : unit.replace(".", "Dotted");
}
