"use client";

import type { Chart } from "chartdown";
import { useMemo, useSyncExternalStore } from "react";
import { videoClock } from "../../lib/video/clock";
import { barAt, chartClicks, type VideoBar } from "../../lib/video/sections";

/**
 * The bar the playing video or band recording is on (R-03.11, R-06.7), or null when nothing plays
 * or the metronome does: the metronome comes first.
 */
export function usePlaybackBar(chart: Chart, metronomePlaying: boolean): VideoBar | null {
  const clock = useSyncExternalStore(videoClock.subscribe, videoClock.get, () => null);
  const placed = useMemo(() => chartClicks(chart), [chart]);
  if (metronomePlaying || !clock?.playing || !placed) return null;
  return barAt(placed.bars, placed.list, clock.time, clock.musicStart);
}

/** The bar as a chart section draws it, in one section only. */
export function barIn(bar: VideoBar | null, section: number) {
  return bar && bar.section === section
    ? { row: bar.row, index: bar.index, progress: bar.progress, downbeat: bar.downbeat }
    : undefined;
}

/**
 * The section the open video or band recording is in, by its index in the chart, or null with no
 * player or outside the music (T-2838). Only a new section renders again, not every beat.
 */
export function usePlayingSection(chart: Chart): number | null {
  const placed = useMemo(() => chartClicks(chart), [chart]);
  return useSyncExternalStore(
    videoClock.subscribe,
    () => {
      const clock = videoClock.get();
      if (!clock || !placed) return null;
      return barAt(placed.bars, placed.list, clock.time, clock.musicStart)?.section ?? null;
    },
    () => null,
  );
}
