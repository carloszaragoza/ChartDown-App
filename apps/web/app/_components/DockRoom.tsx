"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { dockRoom } from "../../lib/video/dock";

/**
 * Publishes how much of the screen's bottom an open player takes (T-2505), from its top edge to
 * the bottom of the screen, while it is open and as it changes size.
 */
export function useDockRoom(dock: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = dock.current;
    if (!element) return;
    const measure = () =>
      dockRoom.set(
        Math.max(0, Math.ceil(window.innerHeight - element.getBoundingClientRect().top)),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      dockRoom.set(0);
    };
  }, [dock]);
}

/**
 * Room below the chart as tall as the open player (R-03.11, R-06.7, T-2505), so the player never
 * hides the chart's last sections: they can be scrolled above it. Nothing with no player open.
 */
export function DockRoom() {
  const room = useSyncExternalStore(dockRoom.subscribe, dockRoom.get, () => 0);
  if (room === 0) return null;
  return <div aria-hidden="true" data-dock-room="" style={{ blockSize: room }} />;
}

/** The open player's room, for keeping the bar being followed in view above it. */
export function useDockRoomSize() {
  return useSyncExternalStore(dockRoom.subscribe, dockRoom.get, () => 0);
}

const fullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};

/**
 * Where an open player is drawn: in the element shown full screen when there is one, such as stand
 * mode (R-03.12), since nothing outside it is shown or can be tapped; otherwise in the page's body.
 */
export function useDockTarget(): HTMLElement | null {
  return useSyncExternalStore(
    fullscreen,
    () => (document.fullscreenElement as HTMLElement | null) ?? document.body,
    () => null,
  );
}
