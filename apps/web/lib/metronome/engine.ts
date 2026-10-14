import type { BeatStrength } from "@chartdown/ui";
import type { TimelineBar } from "./timeline";

/** One click of the metronome: when it sounds, from the start, and where it is in the song. */
export interface Click {
  /** Seconds from the first click. */
  time: number;
  /** Index into the timeline, or -1 for a bar of count-in. */
  bar: number;
  /** Index of the beat in its bar. */
  beat: number;
  /** The beat as the counter shows it, from 1. */
  count: number;
  /** How many beats the bar counts, for the "2 / 4" counter (R-11.3). */
  of: number;
  strength: BeatStrength;
  /** Beat 1 is accented (R-11.7, R-11.8). */
  accent: boolean;
}

export interface ClickOptions {
  /** The timeline bar to start on (R-11.2); the first by default. */
  from?: number;
  /** One bar of clicks before the first bar (R-11.8). */
  countIn?: boolean;
  /** The tempo for a chart that has none, asked of the person (R-11.1). */
  tempo?: number;
  /** A share of the tempo for practice, such as 0.8 (R-11.9); the chart never changes. */
  speed?: number;
}

/**
 * Every click from a starting bar to the end of the song (T-1502). Each time is the sum of the
 * beats before it at their own tempo, computed once, so a long song never drifts: the clicks are
 * then handed to the audio clock, which keeps them (R-11.12).
 */
export function clicks(bars: readonly TimelineBar[], options: ClickOptions = {}): Click[] {
  const { from = 0, countIn = false, tempo: asked, speed = 1 } = options;
  const start = bars[from];
  if (!start) return [];
  const length = (bar: TimelineBar) => {
    const bpm = bar.tempo ?? asked;
    if (!bpm || bpm <= 0) throw new Error("The chart has no tempo: ask the person for one");
    return 60 / (bpm * speed);
  };
  const out: Click[] = [];
  let time = 0;
  if (countIn) {
    // A whole bar of the starting bar's meter, at its tempo.
    for (let beat = 0; beat < start.meter.beats; beat++) {
      out.push({
        time,
        bar: -1,
        beat,
        count: beat + 1,
        of: start.meter.beats,
        strength: beat === 0 ? "strong" : "weak",
        accent: beat === 0,
      });
      time += length(start);
    }
  }
  for (let index = from; index < bars.length; index++) {
    const bar = bars[index] as TimelineBar;
    const beat = length(bar);
    for (const [at, counted] of bar.beats.entries()) {
      out.push({
        time,
        bar: index,
        beat: at,
        count: counted.count,
        of: bar.meter.beats,
        strength: counted.strength,
        accent: counted.count === 1,
      });
      time += beat;
    }
  }
  return out;
}

/** The audio clock: seconds that never jump, as `AudioContext.currentTime` keeps them. */
export interface Clock {
  now(): number;
}

/** The device's audio clock, from the AudioContext a tap on Play creates. */
export function audioClock(context: Pick<AudioContext, "currentTime">): Clock {
  return { now: () => context.currentTime };
}

/** How far ahead clicks are handed to the audio clock, and how often the queue is filled. */
export const LOOKAHEAD = 0.1;
export const FILL_EVERY_MS = 25;

/**
 * Plays a list of clicks on the person's own device (R-11.14). The clicks are scheduled on the
 * audio clock a little ahead of time, never by timers: a timer only fills the queue, so a late
 * timer delays nothing (R-11.12). `onSchedule` receives each click with the clock time it sounds
 * at; `position` says which click the clock has reached, for the pulse (R-11.3).
 */
export class Metronome {
  private next = 0;
  private startedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly list: readonly Click[],
    private readonly clock: Clock,
    private readonly onSchedule: (click: Click, at: number) => void = () => {},
  ) {}

  /** Starts a short moment from now, so the first click is never late. */
  start(): void {
    this.stop();
    this.next = 0;
    this.startedAt = this.clock.now() + LOOKAHEAD;
    this.fill();
    this.timer = setInterval(() => this.fill(), FILL_EVERY_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get isPlaying(): boolean {
    return this.timer !== null;
  }

  /** The clock time a click sounds at. */
  at(click: Click): number {
    return this.startedAt + click.time;
  }

  /** The click the clock has reached, or undefined before the first and after the end. */
  position(): Click | undefined {
    const now = this.clock.now();
    if (!this.isPlaying || now < this.startedAt) return undefined;
    let low = 0;
    let high = this.list.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.at(this.list[middle] as Click) <= now) low = middle;
      else high = middle - 1;
    }
    return this.list[low];
  }

  private fill(): void {
    const until = this.clock.now() + LOOKAHEAD;
    while (this.next < this.list.length && this.at(this.list[this.next] as Click) <= until) {
      const click = this.list[this.next] as Click;
      this.onSchedule(click, this.at(click));
      this.next++;
    }
    // The last click is handed over; stop once it has sounded.
    const last = this.list[this.list.length - 1];
    if (this.next >= this.list.length && (!last || this.clock.now() > this.at(last) + 1))
      this.stop();
  }
}
