import { useSyncExternalStore } from "react";
import { PHONE_QUERY } from "./phoneAgent";

/** A phone held sideways: its screen is short, so stand mode keeps its controls on one line. */
export const SHORT_QUERY = "(max-height: 499px)";

function useMedia(query: string, guess: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => guess,
  );
}

/**
 * Whether the screen is a phone's (R-03.8). The server and the first render use the server's
 * guess from the browser's user agent, so a phone never sees the iPad layout first; afterwards
 * the screen itself decides, and turning the phone or resizing the window follows.
 */
export function usePhone(guess: boolean): boolean {
  return useMedia(PHONE_QUERY, guess);
}

/** Whether the screen is short, a phone in landscape; the server cannot tell, so it says no. */
export function useShortScreen(): boolean {
  return useMedia(SHORT_QUERY, false);
}
