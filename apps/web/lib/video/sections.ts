// Where each section falls in a version's video (R-03.11, T-2502): the chart played in order at its
// tempo, as the metronome counts it, counted from where the music starts in the video.
import { formStripItems } from "@chartdown/ui";
import type { Chart } from "chartdown";
import { repeats } from "../chart/repeats";
import { clicks, type Click } from "../metronome/engine";
import { timeline, type TimelineBar } from "../metronome/timeline";

export interface VideoSection {
  /** Index into `chart.sections`. */
  section: number;
  name: string;
  /** Seconds into the video. */
  start: number;
  end: number;
}

/**
 * The sections in the order the chart plays them, each with where it starts and ends in the video,
 * or null when the chart has no tempo to count them by. `musicStart` is where the first bar's
 * first beat falls in the video, in seconds.
 */
export function videoSections(chart: Chart, musicStart: number): VideoSection[] | null {
  const bars = timeline(chart);
  if (bars.length === 0 || bars.some((bar) => bar.tempo === undefined)) return null;
  const all = clicks(bars);
  const out: VideoSection[] = [];
  for (const click of all) {
    const bar = bars[click.bar];
    if (!bar) continue;
    const last = out.at(-1);
    if (last && last.section === bar.section) continue;
    if (last) last.end = musicStart + click.time;
    out.push({
      section: bar.section,
      name: chart.sections[bar.section]?.name ?? "",
      start: musicStart + click.time,
      end: musicStart + click.time,
    });
  }
  const final = all.at(-1);
  const last = out.at(-1);
  if (final && last) last.end = musicStart + final.time + final.duration;
  return out;
}

/**
 * How the sections bar names each section (T-2505): as the song form does, by its abbreviation
 * (V1, C2), with which time it is when the chart plays it more than once (B1, B1², B1³).
 */
export function sectionLabels(
  chart: Chart,
  sections: readonly VideoSection[],
): { abbreviation: string; time: number; of: number }[] {
  const names = formStripItems(chart, -1, () => false).map((item) => item.abbreviation);
  const abbreviations = sections.map((section) => names[section.section] ?? "");
  const times = repeats(abbreviations);
  return abbreviations.map((abbreviation, index) => ({
    abbreviation,
    ...(times[index] ?? { time: 1, of: 1 }),
  }));
}

/** The section playing at a time in the video, as an index into the list, or -1 outside it. */
export function sectionAt(sections: readonly VideoSection[], seconds: number): number {
  return sections.findIndex((section) => seconds >= section.start && seconds < section.end);
}

/** The bar being played at a time in the video, where it is drawn and its beat, or null. */
export interface VideoBar {
  /** The bar's place in the timeline. */
  at: number;
  section: number;
  row: number;
  index: number;
  progress: number;
  downbeat: boolean;
}

/**
 * The bar playing `seconds` into the video (T-2504), from the chart's clicks (`clicks(timeline)`)
 * and where the music starts; null before the first beat or after the last.
 */
export function barAt(
  bars: readonly TimelineBar[],
  list: readonly Click[],
  seconds: number,
  musicStart: number,
): VideoBar | null {
  const time = seconds - musicStart;
  const lastClick = list.at(-1);
  if (time < 0 || !lastClick || time >= lastClick.time + lastClick.duration) return null;
  // The last click at or before the time.
  let low = 0;
  let high = list.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((list[middle] as Click).time <= time) low = middle;
    else high = middle - 1;
  }
  const click = list[low] as Click;
  const bar = bars[click.bar];
  if (!bar) return null;
  // Beat by beat, as the metronome marks it: the beat sounding fills its share of the bar.
  return {
    at: click.bar,
    section: bar.section,
    row: bar.row,
    index: bar.index,
    progress: (click.beat + 1) / Math.max(bar.beats.length, 1),
    downbeat: click.count === 1,
  };
}

/** The chart's bars and clicks, to place the video on it; null with no tempo. */
export function chartClicks(chart: Chart): { bars: TimelineBar[]; list: Click[] } | null {
  const bars = timeline(chart);
  if (bars.length === 0 || bars.some((bar) => bar.tempo === undefined)) return null;
  return { bars, list: clicks(bars) };
}
