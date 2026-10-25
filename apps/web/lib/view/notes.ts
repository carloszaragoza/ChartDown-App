// Show notes (R-03.2, R-03.12, T-2843): one choice in View, kept on the device, that hides every
// section's notes (the MD's, the instruments' and the author's) on the pages that read a chart:
// the version, a set's song, stand mode and a downloaded set. The editors always show them.
// Storage can be missing or blocked: the notes show then.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "chartdown:hide-notes";

let cached: boolean | null = null;
const listeners = new Set<() => void>();

export const hiddenNotes = {
  get(): boolean {
    if (cached !== null) return cached;
    try {
      cached = window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      cached = false;
    }
    return cached;
  },
  server: (): boolean => false,
  set(hidden: boolean) {
    cached = hidden;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(hidden));
    } catch {
      // Without storage the choice lasts until the page is left.
    }
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Whether this device hides the sections' notes. */
export function useHiddenNotes(): boolean {
  return useSyncExternalStore(hiddenNotes.subscribe, hiddenNotes.get, hiddenNotes.server);
}
