/**
 * Live sync's shared clock (SPEC-14, Technical Plan 7.2, T-3037): the leader's clock, which each
 * follower learns by measuring how far its own clock is from it, as NTP does. Pure, so it is
 * tested without a network.
 */

/** The page's own clock in milliseconds: monotonic, never jumps (the system clock may). */
export function deviceNow(): number {
  return performance.timeOrigin + performance.now();
}

/** One exchange's result: how far the leader's clock is ahead of this device's, and the round trip. */
export interface ClockSample {
  offset: number;
  delay: number;
}

/**
 * An exchange's four times, in milliseconds: the follower sent at `sent`, the leader received
 * at `received` and answered at `answered`, both on its clock; the follower got it at `got`.
 * The network's time is the round trip less the leader's own; the offset assumes the way there
 * took as long as the way back, so its error is at most half the delay.
 */
export function sampleOf(
  sent: number,
  received: number,
  answered: number,
  got: number,
): ClockSample {
  return {
    delay: got - sent - (answered - received),
    offset: (received - sent + (answered - got)) / 2,
  };
}

/** Exchanges kept: the fastest of them sets the offset, the least disturbed by the network. */
export const KEPT = 16;
/**
 * A round trip under this bounds the offset's error to half of it, 5 ms: what a direct link on
 * one Wi-Fi gives (R-14.7). Through the internet the round trip is longer, though the error is
 * far smaller than half of it when the way there and back take alike (measured October 30, 2026).
 */
export const DIRECT_DELAY_MS = 10;
/** Exchanges kept before the clock counts as known: enough to choose the fastest (R-14.1). */
export const IN_SYNC_SAMPLES = 3;
/** A new offset is eased in over this time, never jumped, while the band plays (R-14.3). */
export const EASE_MS = 1500;

/**
 * A follower's view of the leader's clock (R-14.1, R-14.3, R-14.9): it keeps its last exchanges,
 * takes the offset of the fastest, and eases from the offset it applied to a new one, so a beat
 * counted on it never jumps. It keeps what it knows when the connection drops.
 */
export class SharedClock {
  private samples: ClockSample[] = [];
  private from = 0;
  private target = 0;
  private since = 0;
  private known = false;

  constructor(private readonly now: () => number = deviceNow) {}

  /** Adds an exchange; the offset moves toward the fastest exchange kept. */
  add(sample: ClockSample): void {
    if (!(sample.delay >= 0) || !Number.isFinite(sample.offset)) return;
    this.samples = [...this.samples, sample].slice(-KEPT);
    const best = this.best();
    if (!best) return;
    const at = this.now();
    if (!this.known) {
      // The first one is applied at once: nothing counts on the clock yet.
      this.known = true;
      this.from = this.target = best.offset;
      this.since = at;
      return;
    }
    if (best.offset === this.target) return;
    this.from = this.applied(at);
    this.target = best.offset;
    this.since = at;
  }

  /** The fastest exchange kept, or none yet. */
  best(): ClockSample | undefined {
    return this.samples.reduce<ClockSample | undefined>(
      (fastest, sample) => (!fastest || sample.delay < fastest.delay ? sample : fastest),
      undefined,
    );
  }

  /** In sync (R-14.1): enough exchanges kept to take the fastest, and the band's moments on it. */
  get isInSync(): boolean {
    return this.samples.length >= IN_SYNC_SAMPLES;
  }

  /** Known within 5 ms, as a direct link on one Wi-Fi gives (R-14.7). */
  get isDirect(): boolean {
    return (this.best()?.delay ?? Infinity) < DIRECT_DELAY_MS;
  }

  /** Whether any exchange has been made. */
  get isKnown(): boolean {
    return this.known;
  }

  /** The offset applied at a moment of this device's clock, easing toward the newest. */
  applied(at: number = this.now()): number {
    const done = Math.min(1, Math.max(0, (at - this.since) / EASE_MS));
    return this.from + (this.target - this.from) * done;
  }

  /** The leader's clock now. */
  leaderNow(): number {
    const at = this.now();
    return at + this.applied(at);
  }

  /** A moment on the leader's clock, on this device's. */
  toLocal(leaderMoment: number): number {
    return leaderMoment - this.applied();
  }
}
