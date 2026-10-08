import {
  layoutBeats,
  type Bar,
  type BarItem,
  type Chord,
  type Meter,
  type NoChord,
  type Riff,
  type Row,
} from "chartdown";
import { beatStrength, type BeatStrength } from "./beats";

/** The Beats control (R-03.7, design/chart-viewer section 5): how many bars show beat marks. */
export type BeatsMode = "off" | "auto" | "always";

export const BEATS_MODES: readonly BeatsMode[] = ["off", "auto", "always"];

/** The mode asked for in the address or remembered; anything unknown is Auto, the default. */
export function readBeatsMode(value: string | null | undefined): BeatsMode {
  return BEATS_MODES.find((mode) => mode === value) ?? "auto";
}

/** One slash of a bar: where it is, how far it reaches and how strong it is. */
export interface BeatMark {
  /** Position in the bar, in beats of the meter's top number (0 is the start of the bar). */
  at: number;
  /** Beats up to the next mark, or to the end of the bar. */
  length: number;
  strength: BeatStrength;
  /** Its number in the meter, from 1: the third beat of 4/4, the second big beat of 6/8. */
  number: number;
}

const EPSILON = 1e-6;

/** 6/8, 9/8 and 12/8: a top number that is a multiple of 3 above 3, over 8 (section 5). */
export const isCompound = (meter: Meter) =>
  meter.unit === 8 && meter.beats % 3 === 0 && meter.beats > 3;

/** The meter a bar is in: its own `[m:N/D]`, else its row's. */
const meterOf = (bar: Bar, row: Row): Meter => bar.meter ?? row.meter;

/** Beats of the meter a pickup leaves out: a pickup is the last beats of a bar. */
const offsetOf = (bar: Bar, meter: Meter) =>
  bar.pickup === undefined ? 0 : Math.max(meter.beats - bar.pickup, 0);

/**
 * The marks of a bar by its meter (section 5): a slash per beat in simple meters, per eighth in
 * irregular ones, per big beat in compound ones. A pickup keeps only the marks that fall in its
 * beats.
 */
export function beatMarks(bar: Bar, row: Row): BeatMark[] {
  const meter = meterOf(bar, row);
  const offset = offsetOf(bar, meter);
  const length = bar.pickup ?? meter.beats;
  const step = isCompound(meter) ? 3 : 1;
  const all: { at: number; strength: BeatStrength; number: number }[] = [];
  for (let at = 0, number = 1; at < meter.beats - EPSILON; at += step, number += 1) {
    const strength: BeatStrength = isCompound(meter)
      ? at === 0
        ? "strong"
        : "semi"
      : beatStrength(at, meter.beats, meter.unit);
    all.push({ at, strength, number });
  }
  const inside = all.filter((mark) => mark.at >= offset - EPSILON);
  return inside.map((mark, index) => {
    const next = inside[index + 1]?.at ?? offset + length;
    return {
      at: mark.at - offset,
      length: next - mark.at,
      strength: mark.strength,
      number: mark.number,
    };
  });
}

const isTimed = (item: BarItem): item is Chord | NoChord | Riff =>
  item.type === "chord" || item.type === "no-chord" || item.type === "riff";

/** Where each timed token of a bar starts and ends, in beats from the start of the bar. */
export function tokenSpans(bar: Bar, row: Row): { item: BarItem; start: number; end: number }[] {
  const length = bar.pickup ?? meterOf(bar, row).beats;
  const timed = bar.items.filter(isTimed);
  const { shares } = layoutBeats(timed, length);
  let at = 0;
  return timed.map((item, index) => {
    const start = at;
    at += shares[index] ?? 0;
    return { item, start, end: at };
  });
}

/** Whether a position of the bar is on a beat: a big beat in a compound meter (section 5). */
function onBeat(position: number, bar: Bar, row: Row): boolean {
  const meter = meterOf(bar, row);
  const grid = isCompound(meter) ? 3 : 1;
  const ratio = (position + offsetOf(bar, meter)) / grid;
  return Math.abs(ratio - Math.round(ratio)) < EPSILON;
}

export interface BeatsContext {
  /** The bar is the first of a row that follows an `@meter`: the new count is worth seeing. */
  firstAfterMeterChange?: boolean;
}

/**
 * Whether a bar shows beat marks (R-03.7, design/chart-viewer section 5). Off never; Always
 * every bar but one that is only `%`; Auto only where marks tell something: an explicit `:beats`,
 * a chord off the beat, a push, a partial rest, a riff, a pickup, a meter of its own, or the
 * first bar after a meter change.
 */
export function showBeats(
  bar: Bar,
  row: Row,
  mode: BeatsMode,
  context: BeatsContext = {},
): boolean {
  if (mode === "off" || bar.items.length === 0) return false;
  if (bar.items.length === 1 && bar.items[0]?.type === "repeat-bar") return false;
  if (mode === "always") return true;

  if (bar.pickup !== undefined || bar.meter !== undefined || context.firstAfterMeterChange) {
    return true;
  }
  const spans = tokenSpans(bar, row);
  if (spans.some(({ item }) => "explicitBeats" in item && item.explicitBeats === true)) return true;
  if (spans.some(({ item }) => item.type === "riff")) return true;
  if (spans.some(({ item }) => item.type === "chord" && item.push)) return true;
  // A rest beside other tokens is a partial rest; a rest alone is a whole bar of N.C.
  if (spans.length > 1 && spans.some(({ item }) => item.type === "no-chord")) return true;
  return spans.some(({ item, start }) => item.type === "chord" && !onBeat(start, bar, row));
}
