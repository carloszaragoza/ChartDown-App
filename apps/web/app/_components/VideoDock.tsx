"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { ArrowTopRightOnSquareIcon, PlayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { videoClock } from "../../lib/video/clock";
import { videoSections } from "../../lib/video/sections";
import { chartWave, shapedWave } from "../../lib/video/wave";
import { useDockRoom, useDockTarget } from "./DockRoom";
import {
  MusicPointsControls,
  PlayerVolume,
  SectionCells,
  useMusicEnd,
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
  pauseVideo?(): void;
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
  const dock = useRef<HTMLElement>(null);
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
      const playing = player.current?.getPlayerState?.() === 1;
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

  const seek = (seconds: number) => {
    const to = Math.max(0, seconds);
    seeking.current = { to, at: performance.now() };
    player.current?.seekTo?.(to, true);
    setNow(to);
  };
  const clock = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return (
    <aside
      ref={dock}
      className="cd-player"
      style={{ insetInlineStart: playerStart }}
      data-compact={chart ? undefined : ""}
      aria-label={t("player")}
    >
      {/* Every control in one row along the top (T-2828). */}
      <div className="cd-player__controls">
        {chart && (
          <MusicPointsControls
            start={musicStart}
            end={musicEnd}
            now={now}

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
        {chart && !sections && <Text type="supporting">{t("noTempo")}</Text>}
        <HStack gap={1} vAlign="center">
          <Text type="supporting">
            {t("player")} · {clock(now)}
          </Text>
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
        </HStack>
      </div>
      {saving === "failed" && (
        <div role="alert">
          <Text type="supporting">{t("saveFailed")}</Text>
        </div>
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
              onSeek={seek}
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
