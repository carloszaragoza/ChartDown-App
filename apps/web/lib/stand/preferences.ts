// Stand mode's View choices that belong to the device, not the address (R-03.12, T-2805): how many
// sections follow the current one, the motion and the number size. Storage can be missing or
// blocked: the defaults are used then, and nothing is required.
import type { StandMotion } from "./motion";

export type ComingUp = "1" | "2" | "fill";
export type NumberSize = "sm" | "md" | "lg";

export interface StandPreferences {
  comingUp: ComingUp;
  motion: StandMotion;
  size: NumberSize;
}

export const DEFAULT_PREFERENCES: StandPreferences = {
  comingUp: "fill",
  motion: "calm",
  size: "md",
};

const STORAGE_KEY = "chartdown:stand-view";

/** Saved choices read back, each one checked; anything unknown falls back to its default. */
export function readPreferences(saved: unknown): StandPreferences {
  const value = (saved && typeof saved === "object" ? saved : {}) as Record<string, unknown>;
  const pick = <T extends string>(given: unknown, options: readonly T[], fallback: T): T =>
    options.includes(given as T) ? (given as T) : fallback;
  return {
    comingUp: pick(value.comingUp, ["1", "2", "fill"], DEFAULT_PREFERENCES.comingUp),
    motion: pick(value.motion, ["calm", "bounce"], DEFAULT_PREFERENCES.motion),
    size: pick(value.size, ["sm", "md", "lg"], DEFAULT_PREFERENCES.size),
  };
}

/**
 * The sections the stack shows after the current one, in the order they will be played (T-2804):
 * from the queued section when there is one (R-11.15), otherwise from the next; Coming up keeps
 * one, two or every one of them.
 */
export function upcomingSections(
  current: number,
  last: number,
  queued: number | null,
  comingUp: ComingUp,
): number[] {
  const from = queued ?? current + 1;
  const all = Array.from({ length: Math.max(last - from + 1, 0) }, (_, step) => from + step);
  return comingUp === "fill" ? all : all.slice(0, Number(comingUp));
}

let cached: StandPreferences | null = null;
const listeners = new Set<() => void>();

export const standPreferences = {
  get(): StandPreferences {
    if (cached) return cached;
    try {
      cached = readPreferences(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"));
    } catch {
      cached = DEFAULT_PREFERENCES;
    }
    return cached;
  },
  server: (): StandPreferences => DEFAULT_PREFERENCES,
  set(changes: Partial<StandPreferences>) {
    cached = { ...standPreferences.get(), ...changes };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
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
