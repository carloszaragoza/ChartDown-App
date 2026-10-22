import { beatStrength, type BeatStrength } from "@chartdown/ui";
import {
  layoutBeats,
  playOrder,
  rowBeatUnit,
  type BarItem,
  type BeatUnit,
  type Chart,
  type Meter,
} from "chartdown";

/** One beat the metronome counts: its number in the bar, how strong it is, what sounds on it. */
export interface TimelineBeat {
  /** The beat as the counter shows it, from 1; a pickup counts the bar's last beats. */
  count: number;
  strength: BeatStrength;
  /** Index into the bar's items of the token sounding on this beat, or -1 (`%`, a tie). */
  item: number;
}

/** One bar in the order it is played (R-11.4), with the beats it counts (R-11.5). */
export interface TimelineBar {
  /** Index into `chart.sections`. */
  section: number;
  /** Where the bar is drawn: its row in the section and its place in the row. */
  row: number;
  index: number;
  /** The bar's number in its section (0 for a pickup) and the pass of its repeat. */
  number: number;
  pass: number;
  meter: Meter;
  /** The tempo's number, as written; undefined when the chart has none. */
  tempo?: number;
  /**
   * What that number counts (ChartDown 0.9, R-00.18): the unit written in its row, or the row's
   * meter's (the dotted quarter in 6/8, 9/8 and 12/8); undefined with no tempo or with `?`.
   */
  unit?: BeatUnit;
  /** The tempo was written with `?`: the person says what it counts before Play (R-11.16). */
  unconfirmed?: true;
  /** A fermata in the bar: playback waits there for a tap (R-11.6). */
  fermata: boolean;
  beats: TimelineBeat[];
}

/** The first eighth of each group of three in 6/8, 9/8 and 12/8, after beat 1 (R-11.7). */
export function startsGroup(meter: Meter, beat: number): boolean {
  const isCompound = meter.unit === 8 && meter.beats > 3 && meter.beats % 3 === 0;
  return isCompound && beat > 0 && beat % 3 === 0;
}

const isTimed = (item: BarItem) =>
  item.type === "chord" || item.type === "no-chord" || item.type === "riff";

/**
 * The song as the metronome plays it (T-1501, R-11.4, R-11.5): every bar in play order, after
 * sections, `@use`, repeats, endings and navigation (`chartdown`'s `playOrder`), each with its
 * meter (`meter`, `@meter`, `[m:N/D]`), its tempo (`tempo`, `@tempo`, or the set's when given)
 * and, for each beat, the token sounding on it (`:beats`, shared as `layoutBeats` shares them).
 * A pickup counts only its own beats, the last of the bar. Tempo marks (`{rit}`, `{accel}`)
 * don't change the click: the metronome keeps the written tempo.
 */
export function timeline(chart: Chart, options: { tempo?: number } = {}): TimelineBar[] {
  return playOrder(chart).flatMap((step) => {
    const rows = chart.sections[step.section]?.rows ?? [];
    for (const [rowIndex, row] of rows.entries()) {
      const index = row.bars.findIndex((bar) => bar.number === step.bar);
      const bar = row.bars[index];
      if (!bar) continue;
      const meter = bar.meter ?? row.meter;
      const length = bar.pickup ?? meter.beats;
      const first = meter.beats - length;
      // Where each timed token starts and ends, in beats from the start of what is played.
      const timed = bar.items.flatMap((item, at) => (isTimed(item) ? [{ item, at }] : []));
      const { shares } = layoutBeats(
        timed.map(({ item }) => item as { beats?: number; explicitBeats?: boolean }),
        length,
      );
      let end = 0;
      const spans = timed.map(({ at }, i) => {
        const start = end;
        end += shares[i] ?? 0;
        return { at, start, end };
      });
      const tempo = options.tempo ?? row.tempo ?? chart.tempo;
      // The unit counts in the row's meter, so a one-bar meter keeps the eighth note's length.
      const counted = {
        meter: row.meter,
        ...(tempo !== undefined ? { tempo } : {}),
        ...((row.tempoUnit ?? chart.tempoUnit)
          ? { tempoUnit: row.tempoUnit ?? chart.tempoUnit }
          : {}),
        ...(row.tempoUnconfirmed || (row.tempo === undefined && chart.tempoUnconfirmed)
          ? { tempoUnconfirmed: true as const }
          : {}),
      };
      const unit = rowBeatUnit(counted);
      return [
        {
          section: step.section,
          row: rowIndex,
          index,
          number: bar.number,
          pass: step.pass,
          meter,
          ...(tempo !== undefined ? { tempo } : {}),
          ...(unit ? { unit } : {}),
          ...(counted.tempoUnconfirmed ? { unconfirmed: true as const } : {}),
          fermata: bar.items.some((item) => item.type === "chord" && item.fermata),
          beats: Array.from({ length: Math.max(1, Math.ceil(length)) }, (_, beat) => ({
            count: first + beat + 1,
            strength: beatStrength(first + beat, meter.beats, meter.unit),
            item:
              spans.find((span) => beat >= span.start - 1e-9 && beat < span.end - 1e-9)?.at ?? -1,
          })),
        },
      ];
    }
    return [];
  });
}
