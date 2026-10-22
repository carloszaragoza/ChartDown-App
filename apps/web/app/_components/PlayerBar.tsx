"use client";

import { Button } from "@astryxdesign/core/Button";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { Icon } from "@astryxdesign/core/Icon";
import { Slider } from "@astryxdesign/core/Slider";
import { Text } from "@astryxdesign/core/Text";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import {
  AdjustmentsHorizontalIcon,
  FlagIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
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
  end = null,
}: {
  chart: Chart;
  sections: VideoSection[];
  /** Heights from 0 to 1 from the first section's start to the last one's end. */
  wave?: readonly number[];
  /** Where the music ends, when it is set: what lies after it is dimmed (T-2831). */
  end?: number | null;
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
      {end !== null && end < first + span && (
        <div
          className="cd-player-cells__after"
          aria-hidden="true"
          style={{ insetInlineStart: `${(Math.max(end - first, 0) / span) * 100}%` }}
        />
      )}
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

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Where the music starts and ends (R-03.11, R-06.7, T-2830, T-2831): a quiet button in the
 * player's top row says both, and opens their controls under it. Each point is named and its time
 * written; framed buttons move it by a step that says its size, and "Set to 3:55" puts it where
 * the player is, naming that time; the end is optional, and Remove the end clears it. The owner
 * (or the band's MD) saves both together.
 */
export function MusicPointsControls({
  start,
  end,
  now,
  step,
  max,
  onStart,
  onEnd,
  saveLabel,
  isSaving,
  onSave,
}: {
  start: number;
  end: number | null;
  now: number;
  /** How far a step moves a point, in seconds. */
  step: number;
  /** The recording's length, when it is known. */
  max?: number;
  onStart: (seconds: number) => void;
  onEnd: (seconds: number | null) => void;
  /** Offered when there is something to save and the person may. */
  saveLabel?: string | undefined;
  isSaving: boolean;
  onSave: () => void;
}) {
  const t = useTranslations("video");
  const [isOpen, setOpen] = useState(false);
  const last = max ?? Number.POSITIVE_INFINITY;
  const here = Math.round(now * 100) / 100;
  const size = String(step);
  return (
    <>
      <ToggleButton
        label={
          end === null
            ? t("pointsFrom", { start: clock(start) })
            : t("points", { start: clock(start), end: clock(end) })
        }
        icon={<Icon icon={AdjustmentsHorizontalIcon} />}
        size="sm"
        isPressed={isOpen}
        onPressedChange={setOpen}
      />
      {isOpen && (
        <div className="cd-player__points">
          <div className="cd-player__point" role="group" aria-label={t("start")}>
            <Text type="label">{t("start")}</Text>
            <span className="cd-player__time">{clock(start)}</span>
            <ButtonGroup label={t("moveStart")}>
              <Button
                label={t("back", { step: size })}
                variant="secondary"
                isDisabled={start <= 0}
                onClick={() => onStart(Math.max(0, start - step))}
              />
              <Button
                label={t("forward", { step: size })}
                variant="secondary"
                isDisabled={end !== null && start + step >= end}
                onClick={() => onStart(Math.min(last, start + step))}
              />
            </ButtonGroup>
            <Button
              label={t("setTo", { time: clock(here) })}
              variant="secondary"
              icon={<Icon icon={FlagIcon} />}
              isDisabled={end !== null && here >= end}
              onClick={() => onStart(here)}
            />
          </div>
          <div className="cd-player__point" role="group" aria-label={t("end")}>
            <Text type="label">{t("end")}</Text>
            {end === null ? (
              <>
                <Text type="supporting">{t("noEnd")}</Text>
                <Button
                  label={t("endAt", { time: clock(here) })}
                  variant="secondary"
                  icon={<Icon icon={FlagIcon} />}
                  isDisabled={here <= start}
                  onClick={() => onEnd(here)}
                />
              </>
            ) : (
              <>
                <span className="cd-player__time">{clock(end)}</span>
                <ButtonGroup label={t("moveEnd")}>
                  <Button
                    label={t("back", { step: size })}
                    variant="secondary"
                    isDisabled={end - step <= start}
                    onClick={() => onEnd(end - step)}
                  />
                  <Button
                    label={t("forward", { step: size })}
                    variant="secondary"
                    onClick={() => onEnd(Math.min(last, end + step))}
                  />
                </ButtonGroup>
                <Button
                  label={t("setTo", { time: clock(here) })}
                  variant="secondary"
                  icon={<Icon icon={FlagIcon} />}
                  isDisabled={here <= start}
                  onClick={() => onEnd(here)}
                />
                <Button
                  label={t("removeEnd")}
                  variant="ghost"
                  icon={<Icon icon={TrashIcon} />}
                  isIconOnly
                  tooltip={t("removeEnd")}
                  onClick={() => onEnd(null)}
                />
              </>
            )}
          </div>
          {saveLabel && (
            <Button label={saveLabel} variant="primary" isLoading={isSaving} onClick={onSave} />
          )}
        </div>
      )}
    </>
  );
}

/**
 * Keeps a player within where the music ends (T-2830): it pauses there, and Play after it starts
 * again where the music starts. Called on every tick with where the player is.
 */
export function useMusicEnd(end: number | null, start: number) {
  const stopped = useRef(false);
  return useCallback(
    (time: number, playing: boolean, pause: () => void, seek: (to: number) => void) => {
      if (end === null) {
        stopped.current = false;
        return;
      }
      const atEnd = time >= end - 0.25;
      if (!playing) return;
      if (stopped.current && atEnd) {
        stopped.current = false;
        seek(start);
      } else if (atEnd) {
        stopped.current = true;
        pause();
      } else stopped.current = false;
    },
    [end, start],
  );
}
