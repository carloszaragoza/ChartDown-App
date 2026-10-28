"use client";

import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import {
  ArrowTopRightOnSquareIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { barSeek, type ChartBar, videoClock } from "../../lib/video/clock";
import { barStart, sectionAt, videoSections } from "../../lib/video/sections";
import { chartWave, shapedWave } from "../../lib/video/wave";
import { useDockRoom, useDockTarget } from "./DockRoom";
import { countIn } from "../../lib/video/countIn";
import { useCountIn } from "./useCountIn";
import {
  CountInSwitch,
  MusicPointsControls,
  PlayerVolume,
  SectionCells,
  useMusicEnd,
  usePhonePlayer,
  usePlayerStart,
} from "./PlayerBar";
import type { MusicPoints } from "../../lib/video/points";
import { startSeconds, videoId } from "../../lib/video/youtube";

/** The part of YouTube's IFrame API the dock uses. */
interface YouTubePlayer {
  getCurrentTime?(): number;
  /** 1 while playing. */
  getPlayerState?(): number;
  /** Only once the player is ready. */
  seekTo?(seconds: number, allowSeekAhead: boolean): void;
  /** 0 to 100. */
  getVolume?(): number;
  setVolume?(volume: number): void;
  isMuted?(): boolean;
  mute?(): void;
  pauseVideo?(): void;
  playVideo?(): void;
  unMute?(): void;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      host: string;
      videoId: string;
      width: number;
      height: number;
      playerVars: Record<string, number>;
      events?: { onReady?: () => void };
    },
  ) => YouTubePlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeApi> | null = null;
/** YouTube's IFrame API, loaded once, when a video is first opened. */
function youTubeApi(): Promise<YouTubeApi> {
  loading ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const ready = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      ready?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  });
  return loading;
}

const online = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// The smallest player YouTube allows (R-03.11).
const WIDTH = 356;
const HEIGHT = 200;
// The waveform under the sections is drawn with this many bars.
const WAVE_BARS = 240;

/**
 * A version's YouTube link (R-03.11, T-2501): it opens the video in a mini player docked at the
 * bottom of the page, small and closable, so the chart stays in view while it plays; the dock also
 * links to the video on YouTube. Embedded from youtube-nocookie.com. With no connection only the
 * link is offered. Given the chart, the dock shows its sections as a bar that follows the video
 * (T-2502); since T-2828 the player is a bar across the bottom of the page.
 */
export function VideoLink({
  url,
  chart,
  saved,
  savedEnd,
  save,
  isIconOnly = false,
  size = "lg",
}: {
  url: string;
  chart?: Chart | undefined;
  /** Where the music starts, in seconds, as the owner saved it (T-2503). */
  saved?: number | null | undefined;
  /** Where it ends, in seconds, as the owner saved it (T-2830). */
  savedEnd?: number | null | undefined;
  /** For the version's owner: saves where the music starts for everyone. */
  save?: ((points: MusicPoints) => Promise<boolean>) | undefined;
  /** Only the play icon, as beside the YouTube link's field. */
  isIconOnly?: boolean;
  /** The labelled button's size: large, medium on a phone (T-2811). */
  size?: "md" | "lg";
}) {
  const t = useTranslations("video");
  const id = videoId(url);
  const isOnline = useSyncExternalStore(
    online,
    () => navigator.onLine,
    () => true,
  );
  const [open, setOpen] = useState(false);
  const target = useDockTarget();
  const external = (
    <Button
      label={t("openYouTube")}
      href={url}
      target="_blank"
      variant="ghost"
      size="sm"
      icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
      isIconOnly
      tooltip={t("openYouTube")}
    />
  );
  if (!id || !isOnline) return external;
  return (
    <>
      <Button
        label={isIconOnly ? t("play") : t("watch")}
        variant={isIconOnly ? "ghost" : "secondary"}
        size={isIconOnly ? "md" : size}
        icon={<Icon icon={PlayIcon} />}
        isIconOnly={isIconOnly}
        {...(isIconOnly ? { tooltip: t("play") } : {})}
        onClick={() => setOpen(true)}
      />
      {open &&
        target &&
        createPortal(
          <VideoDock
            id={id}
            start={startSeconds(url)}
            url={url}
            chart={chart}
            saved={saved ?? null}
            savedEnd={savedEnd ?? null}
            save={save}
            onClose={() => setOpen(false)}
          />,
          target,
        )}
    </>
  );
}

function VideoDock({
  id,
  start,
  url,
  chart,
  saved: savedStart,
  savedEnd,
  save,
  onClose,
}: {
  id: string;
  start: number;
  url: string;
  chart: Chart | undefined;
  saved: number | null;
  savedEnd: number | null;
  save: ((points: MusicPoints) => Promise<boolean>) | undefined;
  onClose: () => void;
}) {
  const t = useTranslations("video");
  const isPhone = usePhonePlayer();
  const dock = useRef<HTMLElement>(null);
  // On a phone the video is only heard (T-2841): Play and Pause are the dock's own, and until the
  // video first plays the invisible player lies over Play, since iOS starts its sound only from a
  // tap in the player itself.
  const [isPlaying, setPlaying] = useState(false);
  const [hasStarted, setStarted] = useState(false);
  useDockRoom(dock);
  const playerStart = usePlayerStart(dock);
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const seeking = useRef<{ to: number; at: number } | null>(null);
  const [now, setNow] = useState(0);
  // The video's volume, set here (T-2821): YouTube's own slider is hard to drag in the small
  // player. Read from the player once it is ready.
  const [volume, setVolume] = useState(100);
  const changeVolume = (to: number) => {
    setVolume(to);
    player.current?.setVolume?.(to);
    if (to > 0 && player.current?.isMuted?.()) player.current.unMute?.();
  };
  // Where the first bar falls in the video; the reader moves it to match the recording.
  const [musicStart, setMusicStart] = useState(savedStart ?? start);
  const [stored, setStored] = useState(savedStart);
  // Where the music ends, when it is set: the video pauses there (T-2830).
  const [musicEnd, setMusicEnd] = useState(savedEnd);
  const [storedEnd, setStoredEnd] = useState(savedEnd);
  const keepWithin = useMusicEnd(musicEnd, musicStart);
  const keepRef = useRef(keepWithin);
  useEffect(() => {
    keepRef.current = keepWithin;
  }, [keepWithin]);
  const [saving, setSaving] = useState<"idle" | "saving" | "failed">("idle");
  const startRef = useRef(musicStart);
  useEffect(() => {
    startRef.current = musicStart;
  }, [musicStart]);
  const sections = useMemo(
    () => (chart ? videoSections(chart, musicStart) : null),
    [chart, musicStart],
  );
  // The video's sound can't be read: its waveform is drawn from the chart (T-2829).
  const wave = useMemo(() => (chart ? shapedWave(chartWave(chart, WAVE_BARS)) : []), [chart]);

  useEffect(() => {
    let gone = false;
    void youTubeApi().then((api) => {
      if (gone || !frame.current) return;
      player.current = new api.Player(frame.current, {
        host: "https://www.youtube-nocookie.com",
        videoId: id,
        width: WIDTH,
        height: HEIGHT,
        playerVars: { playsinline: 1, rel: 0, start: Math.floor(start) },
        // A section chosen while the player was still loading is played once it is ready.
        events: {
          onReady: () => {
            const heard = player.current?.isMuted?.() ? 0 : player.current?.getVolume?.();
            if (typeof heard === "number") setVolume(heard);
            const target = seeking.current;
            if (target) {
              seeking.current = { to: target.to, at: performance.now() };
              player.current?.seekTo?.(target.to, true);
            }
          },
        },
      });
    });
    // The bar follows the video, and so does the chart on the page (T-2504), read often enough
    // that each beat shows when it sounds.
    const timer = window.setInterval(() => {
      const time = player.current?.getCurrentTime?.();
      if (typeof time !== "number") return;
      // A section just chosen holds until the video has moved there: until then the player may
      // still report where it was (or 0, not started yet).
      const target = seeking.current;
      if (target !== null) {
        if (Math.abs(time - target.to) > 1 && performance.now() - target.at < 3000) return;
        seeking.current = null;
      }
      setNow(time);
      const state = player.current?.getPlayerState?.();
      const playing = state === 1;
      setPlaying(playing);
      // Playing or loading to play: the first tap has reached the player.
      if (state === 1 || state === 3) setStarted(true);
      videoClock.set({ time, musicStart: startRef.current, playing });
      keepRef.current(
        time,
        playing,
        () => player.current?.pauseVideo?.(),
        (to) => {
          seeking.current = { to, at: performance.now() };
          player.current?.seekTo?.(to, true);
        },
      );
    }, 50);
    return () => {
      gone = true;
      window.clearInterval(timer);
      videoClock.set(null);
      player.current?.destroy();
      player.current = null;
    };
  }, [id, start]);

  const counter = useCountIn();
  const { counting } = counter;
  const recount = useRef<(seconds: number) => void>(() => {});
  // A bar tapped on the chart: the video moves to where it starts (T-2836); one chosen before the
  // video was opened is where it opens (T-3015).
  const opened = useRef(false);
  useEffect(() => {
    const go = ({ section, number }: ChartBar) => {
      const at = chart ? barStart(chart, section, number) : null;
      if (at === null) return;
      const to = Math.max(0, startRef.current + at);
      if (counting.current) return recount.current(to);
      seeking.current = { to, at: performance.now() };
      player.current?.seekTo?.(to, true);
      setNow(to);
    };
    if (!opened.current) {
      opened.current = true;
      const bar = barSeek.chosen();
      if (bar) go(bar);
    }
    return barSeek.subscribe(go);
  }, [chart, counting]);

  const seek = (seconds: number) => {
    const to = Math.max(0, seconds);
    seeking.current = { to, at: performance.now() };
    player.current?.seekTo?.(to, true);
    setNow(to);
  };
  // Play counts one bar first when Count-in is on (R-03.14, T-3023): the dock's own Play, since
  // YouTube's play button in the video can't count; Pause also stops a count, and a section or a
  // bar chosen while it counts counts again into it.
  const countFrom = (seconds: number) => {
    const video = player.current;
    if (!video) return;
    const plan = counter.isOn && chart && sections ? countIn(chart, seconds, musicStart) : null;
    if (!plan) {
      seek(seconds);
      return video.playVideo?.();
    }
    counter.start(plan, {
      time: () => video.getCurrentTime?.() ?? 0,
      seek,
      play: () => video.playVideo?.(),
      pause: () => video.pauseVideo?.(),
      isMuted: () => video.isMuted?.() ?? false,
      setMuted: (muted) => (muted ? video.mute?.() : video.unMute?.()),
    });
  };
  useEffect(() => {
    recount.current = countFrom;
  });
  const toggle = () => {
    const video = player.current;
    if (!video) return;
    if (counter.isCounting) return counter.stop();
    if (isPlaying) return video.pauseVideo?.();
    countFrom(video.getCurrentTime?.() ?? now);
  };
  const chooseTime = (seconds: number) => (counter.isCounting ? countFrom(seconds) : seek(seconds));
  const playLabel = isPlaying || counter.isCounting ? t("pause") : t("play");
  const playIcon = isPlaying || counter.isCounting ? PauseIcon : PlayIcon;
  const clock = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  // On a phone the strip shows only song-form names, so the one playing is named beside the video.
  const playing = sections ? sections[sectionAt(sections, now)] : undefined;

  return (
    <aside
      ref={dock}
      className="cd-player"
      style={{ insetInlineStart: playerStart }}
      data-compact={chart ? undefined : ""}
      data-video=""
      data-started={hasStarted ? "" : undefined}
      aria-label={t("player")}
    >
      {/* Every control in one row along the top (T-2828). */}
      <div className="cd-player__controls">
        {chart && (
          <MusicPointsControls
            start={musicStart}
            end={musicEnd}
            now={now}
            isCompact={isPhone}
            onStart={setMusicStart}
            onEnd={setMusicEnd}
            saveLabel={
              save && (musicStart !== stored || musicEnd !== storedEnd) ? t("saveStart") : undefined
            }
            isSaving={saving === "saving"}
            onSave={() => {
              if (!save) return;
              setSaving("saving");
              void save({
                startMs: musicStart * 1000,
                endMs: musicEnd === null ? null : musicEnd * 1000,
              }).then((done) => {
                setSaving(done ? "idle" : "failed");
                if (done) {
                  setStored(musicStart);
                  setStoredEnd(musicEnd);
                }
              });
            }}
          />
        )}
        {chart && !sections && (
          <span className="cd-player__note">
            <Text type="supporting">{t("noTempo")}</Text>
          </span>
        )}
        {sections && (
          <CountInSwitch isOn={counter.isOn} onChange={counter.setOn} beat={counter.beat} />
        )}
        {isPhone && playing && (
          <p className="cd-player__now" aria-hidden="true">
            {playing.name}
          </p>
        )}
        <div className="cd-player__end">
          {!isPhone && (
            <Button
              label={playLabel}
              variant="secondary"
              size="sm"
              icon={<Icon icon={playIcon} />}
              isIconOnly
              tooltip={playLabel}
              onClick={toggle}
            />
          )}
          <span className="cd-player__clock">
            <span className="cd-player__kind">{t("player")} · </span>
            {clock(now)}
          </span>
          <Button
            label={t("openYouTube")}
            href={url}
            target="_blank"
            variant="ghost"
            size="sm"
            icon={<Icon icon={ArrowTopRightOnSquareIcon} />}
            isIconOnly
            tooltip={t("openYouTube")}
          />
          <Button
            label={t("close")}
            variant="ghost"
            size="sm"
            icon={<Icon icon={XMarkIcon} />}
            isIconOnly
            tooltip={t("close")}
            onClick={onClose}
          />
        </div>
      </div>
      {saving === "failed" && (
        <div role="alert" className="cd-player__alert">
          <Text type="supporting">{t("saveFailed")}</Text>
        </div>
      )}
      {isPhone && (
        <span className="cd-player__play-video">
          <Button
            label={playLabel}
            variant="primary"
            icon={<Icon icon={playIcon} />}
            isIconOnly
            onClick={toggle}
          />
        </span>
      )}
      <div className="cd-player__body">
        <div className="cd-video-dock__frame">
          <div ref={frame} />
        </div>
        <PlayerVolume label={t("volume")} value={volume} onChange={changeVolume} />
        {chart && sections && (
          <div className="cd-player__main">
            <SectionCells
              chart={chart}
              sections={sections}
              now={now}
              onSeek={chooseTime}
              label={t("sections")}
              goTo={(name) => t("goTo", { name })}
              wave={wave}
              end={musicEnd}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
