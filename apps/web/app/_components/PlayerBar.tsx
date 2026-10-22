"use client";

import { Icon } from "@astryxdesign/core/Icon";
import { Slider } from "@astryxdesign/core/Slider";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { sectionAt, sectionLabels, type VideoSection } from "../../lib/video/sections";

/**
 * Where a player across the bottom starts (T-2828): at the side navigation's edge, so it never
 * covers it, or at the screen's edge in stand mode and on a phone, where there is none. Measured
 * again as the navigation collapses or the screen turns.
 */
export function usePlayerStart(dock: RefObject<HTMLElement | null>): number {
  const [start, setStart] = useState(0);
  useEffect(() => {
    const element = dock.current;
    if (!element) return;
    const nav =
      element.parentElement === document.body ? document.querySelector(".astryx-side-nav") : null;
    const panel = nav?.closest(".astryx-layout-panel") ?? null;
    const measure = () =>
      setStart(Math.max(0, Math.round(panel ? panel.getBoundingClientRect().right : 0)));
    const first = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    if (panel) observer.observe(panel);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(first);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [dock]);
  return start;
}

/**
 * The song's sections in the order the chart plays them, as tall cells as wide as each lasts
 * (T-2828): the section's full name small at the top and its song-form name large under it (V1,
 * then V1² the second time); the one playing in the selection color, with a line that fills as it
 * plays. Choosing one takes the player there. A waveform lies across their lower part (T-2829): the
 * recording's, or for a video one drawn from the chart.
 */
export function SectionCells({
  chart,
  sections,
  now,
  onSeek,
  label,
  goTo,
  wave = [],
}: {
  chart: Chart;
  sections: VideoSection[];
  /** Heights from 0 to 1 from the first section's start to the last one's end. */
  wave?: readonly number[];
  now: number;
  onSeek: (seconds: number) => void;
  label: string;
  goTo: (name: string) => string;
}) {
  const playing = sectionAt(sections, now);
  const names = sectionLabels(chart, sections);
  const first = sections[0]?.start ?? 0;
  const span = Math.max((sections.at(-1)?.end ?? first) - first, 0.001);
  const heard = (now - first) / span;
  return (
    <div className="cd-player-cells" role="group" aria-label={label}>
      {wave.length > 0 && (
        <div className="cd-player-cells__wave" aria-hidden="true">
          {wave.map((height, index) => (
            <span
              key={index}
              data-played={(index + 0.5) / wave.length <= heard ? "" : undefined}
              style={{ blockSize: `${Math.max(height, 0.04) * 100}%` }}
            />
          ))}
        </div>
      )}
      {sections.map((section, index) => {
        const { abbreviation = "", time = 1, of = 1 } = names[index] ?? {};
        const isPlaying = index === playing && now >= section.start;
        const played = Math.min(
          Math.max((now - section.start) / Math.max(section.end - section.start, 0.001), 0),
          1,
        );
        return (
          <button
            key={`${section.section}-${index}`}
            type="button"
            className="cd-player-cells__cell"
            style={{ flexGrow: section.end - section.start }}
            aria-label={goTo(section.name)}
            aria-current={index === playing ? "true" : undefined}
            title={section.name}
            onClick={() => onSeek(section.start)}
          >
            <span className="cd-player-cells__name" aria-hidden="true">
              {section.name}
            </span>
            <span className="cd-player-cells__short" aria-hidden="true">
              {abbreviation}
              {of > 1 && time > 1 && <sup>{time}</sup>}
            </span>
            {isPlaying && (
              <span
                className="cd-player-cells__played"
                aria-hidden="true"
                style={{ inlineSize: `${played * 100}%` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A player's volume, always in view as a vertical slider between the sections and the player. */
export function PlayerVolume({
  label,
  value,
  onChange,
}: {
  label: string;
  /** 0 to 100. */
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="cd-player__volume">
      <Slider
        label={label}
        isLabelHidden
        orientation="vertical"
        value={value}
        min={0}
        max={100}
        step={5}
        valueDisplay="tooltip"
        formatValue={(at) => `${Math.round(at)}%`}
        onChange={(at: number) => onChange(at)}
      />
      <Icon icon={value === 0 ? SpeakerXMarkIcon : SpeakerWaveIcon} />
    </div>
  );
}

/**
 * Whether this browser lets a page set a recording's volume: Safari on an iPad or an iPhone
 * doesn't, and leaves it to the device's buttons (T-2828).
 */
let settable: boolean | null = null;
const never = () => () => {};
export function useCanSetVolume(): boolean {
  return useSyncExternalStore(
    never,
    () => {
      if (settable === null) {
        const probe = document.createElement("audio");
        probe.volume = 0.5;
        settable = probe.volume === 0.5;
      }
      return settable;
    },
    () => false,
  );
}
