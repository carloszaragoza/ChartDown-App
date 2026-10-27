"use client";

import { BarRow } from "@chartdown/ui";
import { useEffect, useRef, useSyncExternalStore, type ComponentProps } from "react";
import { videoClock } from "../../../../lib/video/clock";
import { playedIn, type Placed } from "../../../../lib/visual/follow";

/**
 * A row of the visual editor that follows the playing video or band recording bar by bar, as the
 * other editors' charts do (R-13.15, R-03.11). Only the row being played renders as it plays, so
 * the editor around it stays still while the author writes.
 */
export function FollowedBarRow({
  placed,
  section,
  rowIndex,
  isFollowing,
  ...row
}: ComponentProps<typeof BarRow> & {
  placed: Placed;
  section: number;
  rowIndex: number;
  /** Scrolls the bar being played into view; not while a bar is being written. */
  isFollowing: boolean;
}) {
  const key = useSyncExternalStore(
    videoClock.subscribe,
    () => playedIn(placed, videoClock.get(), section, rowIndex),
    () => "",
  );
  const [index, progress, downbeat] = key.split(":");
  const box = useRef<HTMLDivElement>(null);
  const isPlayed = key !== "";
  useEffect(() => {
    if (!isPlayed || !isFollowing) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.current?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
  }, [isPlayed, isFollowing]);
  return (
    <div ref={box}>
      <BarRow
        {...row}
        {...(isPlayed
          ? {
              now: {
                index: Number(index),
                progress: Number(progress),
                downbeat: downbeat === "1",
              },
            }
          : {})}
      />
    </div>
  );
}
