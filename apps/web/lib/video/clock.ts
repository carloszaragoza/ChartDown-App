// Where the open video is (R-03.11, T-2504): the mini player publishes it, and the chart on the
// page follows it as it follows the metronome. One video plays at a time.

export interface VideoClock {
  /** Seconds into the video. */
  time: number;
  /** Where the first bar falls in the video, in seconds. */
  musicStart: number;
  playing: boolean;
}

let current: VideoClock | null = null;
const listeners = new Set<() => void>();

export const videoClock = {
  get: (): VideoClock | null => current,
  set(next: VideoClock | null) {
    if (
      next === current ||
      (next &&
        current &&
        next.time === current.time &&
        next.musicStart === current.musicStart &&
        next.playing === current.playing)
    )
      return;
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

/** A bar of the chart, by its section and its number there, as the page draws it. */
export interface ChartBar {
  section: number;
  number: number;
}

const seekListeners = new Set<(bar: ChartBar) => void>();

/**
 * A bar tapped on the chart while a player is open (T-2836): the open player moves to where that
 * bar starts in it, so Play starts there, or goes on from there when it plays.
 */
export const barSeek = {
  request(bar: ChartBar) {
    for (const listener of seekListeners) listener(bar);
  },
  subscribe(listener: (bar: ChartBar) => void) {
    seekListeners.add(listener);
    return () => {
      seekListeners.delete(listener);
    };
  },
};
