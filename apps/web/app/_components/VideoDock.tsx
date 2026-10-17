"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  ArrowTopRightOnSquareIcon,
  MinusIcon,
  PlayIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { videoClock } from "../../lib/video/clock";
import { sectionAt, videoSections, type VideoSection } from "../../lib/video/sections";
import { startSeconds, videoId } from "../../lib/video/youtube";

/** The part of YouTube's IFrame API the dock uses. */
interface YouTubePlayer {
  getCurrentTime?(): number;
  /** 1 while playing. */
  getPlayerState?(): number;
  /** Only once the player is ready. */
  seekTo?(seconds: number, allowSeekAhead: boolean): void;
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

/**
 * A version's YouTube link (R-03.11, T-2501): it opens the video in a mini player docked at the
 * bottom of the page, small and closable, so the chart stays in view while it plays; the dock also
 * links to the video on YouTube. Embedded from youtube-nocookie.com. With no connection only the
 * link is offered. Given the chart, the dock shows its sections as a bar that follows the video
 * (T-2502).
 */
export function VideoLink({
  url,
  chart,
  saved,
  save,
}: {
  url: string;
  chart?: Chart | undefined;
  /** Where the music starts, in seconds, as the owner saved it (T-2503). */
  saved?: number | null | undefined;
  /** For the version's owner: saves where the music starts for everyone. */
  save?: ((milliseconds: number) => Promise<boolean>) | undefined;
}) {
  const t = useTranslations("video");
  const id = videoId(url);
  const isOnline = useSyncExternalStore(
    online,
    () => navigator.onLine,
    () => true,
  );
  const [open, setOpen] = useState(false);
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
        label={t("play")}
        variant="ghost"
        size="sm"
        icon={<Icon icon={PlayIcon} />}
        onClick={() => setOpen(true)}
      />
      {open &&
        createPortal(
          <VideoDock
            id={id}
            start={startSeconds(url)}
            url={url}
            chart={chart}
            saved={saved ?? null}
            save={save}
            onClose={() => setOpen(false)}
          />,
          document.body,
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
  save,
  onClose,
}: {
  id: string;
  start: number;
  url: string;
  chart: Chart | undefined;
  saved: number | null;
  save: ((milliseconds: number) => Promise<boolean>) | undefined;
  onClose: () => void;
}) {
  const t = useTranslations("video");
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const seeking = useRef<{ to: number; at: number } | null>(null);
  const [now, setNow] = useState(0);
  // Where the first bar falls in the video; the reader moves it to match the recording.
  const [musicStart, setMusicStart] = useState(savedStart ?? start);
  const [stored, setStored] = useState(savedStart);
  const [saving, setSaving] = useState<"idle" | "saving" | "failed">("idle");
  const startRef = useRef(musicStart);
  useEffect(() => {
    startRef.current = musicStart;
  }, [musicStart]);
  const sections = useMemo(
    () => (chart ? videoSections(chart, musicStart) : null),
    [chart, musicStart],
  );

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
      videoClock.set({
        time,
        musicStart: startRef.current,
        playing: player.current?.getPlayerState?.() === 1,
      });
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
    <aside className="cd-video-dock" aria-label={t("player")}>
      <VStack gap={2}>
        <HStack gap={1} vAlign="center">
          <StackItem size="fill">
            <Text type="supporting">{t("player")}</Text>
          </StackItem>
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
        {chart &&
          (sections ? (
            <>
              <SectionsBar
                sections={sections}
                now={now}
                onSeek={seek}
                label={t("sections")}
                goTo={(name) => t("goTo", { name })}
              />
              <HStack gap={1} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Text type="supporting">{t("musicStarts", { time: clock(musicStart) })}</Text>
                </StackItem>
                <Button
                  label={t("earlier")}
                  variant="ghost"
                  size="sm"
                  icon={<Icon icon={MinusIcon} />}
                  isIconOnly
                  tooltip={t("earlier")}
                  onClick={() => setMusicStart((at) => Math.max(0, at - 0.5))}
                />
                <Button
                  label={t("later")}
                  variant="ghost"
                  size="sm"
                  icon={<Icon icon={PlusIcon} />}
                  isIconOnly
                  tooltip={t("later")}
                  onClick={() => setMusicStart((at) => at + 0.5)}
                />
                <Button
                  label={t("startHere")}
                  variant="ghost"
                  size="sm"
                  onClick={() => setMusicStart(Math.round(now * 10) / 10)}
                />
              </HStack>
              {save && musicStart !== stored && (
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Button
                    label={t("saveStart")}
                    size="sm"
                    isLoading={saving === "saving"}
                    onClick={() => {
                      setSaving("saving");
                      void save(musicStart * 1000).then((done) => {
                        setSaving(done ? "idle" : "failed");
                        if (done) setStored(musicStart);
                      });
                    }}
                  />
                  {saving === "failed" && (
                    <div role="alert">
                      <Text type="supporting">{t("saveFailed")}</Text>
                    </div>
                  )}
                </HStack>
              )}
            </>
          ) : (
            <Text type="supporting">{t("noTempo")}</Text>
          ))}
        <div className="cd-video-dock__frame">
          <div ref={frame} />
        </div>
      </VStack>
    </aside>
  );
}

/**
 * The song's sections in the order the chart plays them, each as wide as it lasts; the one playing
 * is marked (selection blue, and its name read out), and choosing one takes the video there.
 */
function SectionsBar({
  sections,
  now,
  onSeek,
  label,
  goTo,
}: {
  sections: VideoSection[];
  now: number;
  onSeek: (seconds: number) => void;
  label: string;
  goTo: (name: string) => string;
}) {
  const playing = sectionAt(sections, now);
  const first = sections[0]?.start ?? 0;
  const last = sections.at(-1)?.end ?? first;
  const span = Math.max(last - first, 1);
  const at = Math.min(Math.max((now - first) / span, 0), 1);
  return (
    <div className="cd-video-bar" role="group" aria-label={label}>
      {sections.map((section, index) => (
        <button
          key={`${section.section}-${index}`}
          type="button"
          className="cd-video-bar__section"
          style={{ flexGrow: section.end - section.start }}
          aria-label={goTo(section.name)}
          aria-current={index === playing ? "true" : undefined}
          title={section.name}
          onClick={() => onSeek(section.start)}
        >
          {section.name}
        </button>
      ))}
      {now >= first && now <= last && (
        <span
          className="cd-video-bar__mark"
          aria-hidden="true"
          style={{ insetInlineStart: `${at * 100}%` }}
        />
      )}
    </div>
  );
}
