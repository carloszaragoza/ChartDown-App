"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowTopRightOnSquareIcon, PlayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { startSeconds, videoId } from "../../lib/video/youtube";

/** The part of YouTube's IFrame API the dock uses. */
interface YouTubePlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
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
 * link is offered.
 */
export function VideoLink({ url }: { url: string }) {
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
          <VideoDock id={id} start={startSeconds(url)} url={url} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

function VideoDock({
  id,
  start,
  url,
  onClose,
}: {
  id: string;
  start: number;
  url: string;
  onClose: () => void;
}) {
  const t = useTranslations("video");
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: YouTubePlayer | null = null;
    let gone = false;
    void youTubeApi().then((api) => {
      if (gone || !frame.current) return;
      player = new api.Player(frame.current, {
        host: "https://www.youtube-nocookie.com",
        videoId: id,
        width: WIDTH,
        height: HEIGHT,
        playerVars: { playsinline: 1, rel: 0, start: Math.floor(start) },
      });
    });
    return () => {
      gone = true;
      player?.destroy();
    };
  }, [id, start]);

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
        <div className="cd-video-dock__frame">
          <div ref={frame} />
        </div>
      </VStack>
    </aside>
  );
}
