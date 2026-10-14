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
  /** Seconds until the next beat, at this bar's tempo. */
  duration: number;
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
        duration: length(start),
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
        duration: beat,
      });
      time += beat;
    }
  }
  return out;
}

/** The section a click belongs to; a count-in belongs to none. */
const sectionOf = (bars: readonly TimelineBar[], click: Click | undefined) =>
  click && click.bar >= 0 ? bars[click.bar]?.section : -1;

/**
 * Where the section a click is in ends, as it is being played: the index of the first click after
 * it. A queued repeat of the same section starts a new stretch, since its bars come again.
 */
export function sectionEnd(list: readonly Click[], bars: readonly TimelineBar[], index: number) {
  const section = sectionOf(bars, list[index]);
  let end = index + 1;
  while (
    end < list.length &&
    sectionOf(bars, list[end]) === section &&
    (list[end] as Click).bar >= (list[end - 1] as Click).bar
  )
    end++;
  return end;
}

/**
 * The clicks with what follows the section being played replaced (R-11.15): `tail`, timed from
 * zero, starts on the beat after the section's last one, so nothing pauses or drifts. Clicks
 * already handed to the audio clock (before `scheduled`) are never changed.
 */
export function continueWith(
  list: readonly Click[],
  bars: readonly TimelineBar[],
  playing: number,
  tail: readonly Click[],
  scheduled = 0,
): { list: Click[]; at: number } {
  const at = Math.max(sectionEnd(list, bars, playing), scheduled);
  const last = list[at - 1];
  const start = list[at]?.time ?? (last ? last.time + last.duration : 0);
  return {
    at,
    list: [...list.slice(0, at), ...tail.map((click) => ({ ...click, time: click.time + start }))],
  };
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
  private list: readonly Click[];

  constructor(
    list: readonly Click[],
    private readonly clock: Clock,
    private readonly onSchedule: (click: Click, at: number) => void = () => {},
  ) {
    this.list = list;
  }

  /** The clicks as they will be played, with any queued change. */
  get clicks(): readonly Click[] {
    return this.list;
  }

  /** How many clicks are already handed to the audio clock: those can no longer change. */
  get scheduled(): number {
    return this.next;
  }

  /** Changes what is played from a click on; never a click already handed over (R-11.15). */
  replace(list: readonly Click[]): void {
    this.list = [...this.list.slice(0, this.next), ...list.slice(this.next)];
  }

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
    const index = this.index();
    return index < 0 ? undefined : this.list[index];
  }

  /** The index of the click the clock has reached, or -1. */
  index(): number {
    const now = this.clock.now();
    if (!this.isPlaying || now < this.startedAt || this.list.length === 0) return -1;
    let low = 0;
    let high = this.list.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.at(this.list[middle] as Click) <= now) low = middle;
      else high = middle - 1;
    }
    return low;
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
