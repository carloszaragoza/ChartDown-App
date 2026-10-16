// Where each section falls in a version's video (R-03.11, T-2502): the chart played in order at its
// tempo, as the metronome counts it, counted from where the music starts in the video.
import type { Chart } from "chartdown";
import { clicks } from "../metronome/engine";
import { timeline } from "../metronome/timeline";

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

/** The section playing at a time in the video, as an index into the list, or -1 outside it. */
export function sectionAt(sections: readonly VideoSection[], seconds: number): number {
  return sections.findIndex((section) => seconds >= section.start && seconds < section.end);
}
