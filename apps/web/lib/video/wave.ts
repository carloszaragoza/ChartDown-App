// The waveform under a player's sections (T-2829). A YouTube video's sound can't be read, so the
// video's waveform is an illustration made from the chart, never the recording: each bar as loud
// as its dynamics say, or as its kind of section suggests, with a texture that looks like sound
// and is the same every time. The band's recording draws its real waveform instead.
import type { Chart, Dynamic } from "chartdown";
import { clicks } from "../metronome/engine";
import { timeline } from "../metronome/timeline";

const LOUDNESS: Partial<Record<Dynamic, number>> = {
  pp: 0.2,
  p: 0.32,
  mp: 0.45,
  mf: 0.6,
  f: 0.8,
  ff: 0.95,
};
// How much louder or softer each bar of a crescendo or a decrescendo gets.
const SWELL = 0.08;

/** How loud a section with no dynamics sounds, from its name: an intro soft, a chorus loud. */
export function sectionLoudness(name: string): number {
  const kind = name.toLowerCase();
  if (/intro|outro|ending|tag|final|coda/.test(kind)) return 0.35;
  if (/pre/.test(kind)) return 0.6;
  if (/chorus|coro/.test(kind)) return 0.8;
  if (/bridge|puente/.test(kind)) return 0.65;
  if (/inst|solo|interlude|interludio/.test(kind)) return 0.7;
  if (/verse|verso/.test(kind)) return 0.5;
  return 0.55;
}

/** A number from 0 to 1 that looks random and is always the same for the same place. */
function noise(at: number): number {
  const x = Math.sin(at * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * `count` heights from 0 to 1 for the chart played in order, from its first beat to its last, or
 * an empty list with no tempo to place its bars.
 */
export function chartWave(chart: Chart, count: number): number[] {
  const bars = timeline(chart);
  if (bars.length === 0 || bars.some((bar) => bar.tempo === undefined)) return [];
  const list = clicks(bars);
  const last = list.at(-1);
  if (!last) return [];
  const end = last.time + last.duration;
  // Each bar's start and its loudness, carried through the section as the chart marks it.
  const starts: number[] = [];
  const levels: number[] = [];
  let section = -1;
  let level = 0;
  let swell = 0;
  for (const click of list) {
    if (starts.length > click.bar) continue;
    const bar = bars[click.bar];
    if (!bar) continue;
    if (bar.section !== section) {
      section = bar.section;
      level = sectionLoudness(chart.sections[section]?.name ?? "");
      swell = 0;
    }
    const dynamic = chart.sections[bar.section]?.rows[bar.row]?.bars[bar.index]?.dynamic;
    if (dynamic === "cresc") swell = SWELL;
    else if (dynamic === "decresc") swell = -SWELL;
    else if (dynamic) {
      level = LOUDNESS[dynamic] ?? level;
      swell = 0;
    } else level = Math.min(Math.max(level + swell, 0.15), 1);
    starts.push(click.time);
    levels.push(level);
  }
  let bar = 0;
  return Array.from({ length: count }, (_, index) => {
    const time = ((index + 0.5) / count) * end;
    while (bar + 1 < starts.length && (starts[bar + 1] as number) <= time) bar++;
    const from = starts[bar] as number;
    const to = starts[bar + 1] ?? end;
    const into = (time - from) / Math.max(to - from, 0.001);
    // Louder on the bar's first beat, swelling and fading slowly and jittering fast, like a
    // recording.
    const slow = index / 7;
    const swellAt =
      noise(Math.floor(slow)) +
      (noise(Math.floor(slow) + 1) - noise(Math.floor(slow))) * (slow - Math.floor(slow));
    const texture = 0.35 + 0.3 * swellAt + 0.25 * noise(index) + 0.15 * (1 - into);
    return Math.min((levels[bar] as number) * texture, 1);
  });
}

/**
 * A recording's waveform (`peaks` from 0 to 1000 over its `duration`) resampled to `count`
 * heights from 0 to 1 between `from` and `to` seconds, where the player's sections lie.
 */
export function windowWave(
  peaks: readonly number[],
  duration: number,
  from: number,
  to: number,
  count: number,
): number[] {
  if (peaks.length === 0 || duration <= 0 || to <= from) return [];
  return Array.from({ length: count }, (_, index) => {
    const start = from + ((to - from) * index) / count;
    const stop = from + ((to - from) * (index + 1)) / count;
    const first = Math.max(0, Math.floor((start / duration) * peaks.length));
    const last = Math.min(
      peaks.length,
      Math.max(first + 1, Math.ceil((stop / duration) * peaks.length)),
    );
    if (first >= peaks.length) return 0;
    return Math.max(...peaks.slice(first, last)) / 1000;
  });
}
