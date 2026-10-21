// How much of the screen's bottom the open player takes (R-03.11, R-06.7, T-2505): the video's or
// the band audio's dock publishes it, and the page keeps that much room below the chart so the
// player never hides it. One player is open at a time.

let current = 0;
const listeners = new Set<() => void>();

export const dockRoom = {
  /** Pixels from the bottom of the screen to the top of the open player; 0 with none open. */
  get: (): number => current,
  set(next: number) {
    if (next === current) return;
    current = next;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
