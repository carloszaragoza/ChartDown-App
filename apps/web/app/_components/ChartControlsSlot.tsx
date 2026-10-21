"use client";

import { useSyncExternalStore } from "react";

const ID = "cd-chart-controls";

/**
 * Where a page's header holds the chart's metronome and View options, so the pinned song form has
 * its whole row (owner's review, October 21, 2026). ChartPreview fills it.
 */
export function ChartControlsSlot() {
  return <div id={ID} />;
}

// Looked up again after the first paint, as a page reached in the app renders before it mounts.
const subscribe = (changed: () => void) => {
  const frame = requestAnimationFrame(changed);
  return () => cancelAnimationFrame(frame);
};

/** The header's slot for the chart's controls, once it is on the page. */
export function useChartControlsSlot(isWanted: boolean): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => (isWanted ? document.getElementById(ID) : null),
    () => null,
  );
}
