import { describe, expect, it } from "vitest";
import { DIRECT_DELAY_MS, EASE_MS, IN_SYNC_SAMPLES, KEPT, sampleOf, SharedClock } from "./clock";

/** A device clock the test moves by hand. */
function handClock(start = 1000) {
  let ms = start;
  return { now: () => ms, advance: (by: number) => (ms += by) };
}

describe("T-3037 live sync's shared clock", () => {
  it("R-14.1 an exchange's four times give the offset and the network's round trip", () => {
    // The leader's clock is 250 ms ahead; 4 ms each way; the leader takes 1 ms to answer.
    const sent = 10_000;
    const received = sent + 4 + 250;
    const answered = received + 1;
    const got = answered - 250 + 4;
    expect(sampleOf(sent, received, answered, got)).toEqual({ offset: 250, delay: 8 });
  });

  it("R-14.1 the fastest exchange kept sets the offset; In sync once 3 are kept", () => {
    const clock = new SharedClock(handClock().now);
    expect(clock.isKnown).toBe(false);
    clock.add({ offset: 262, delay: 40 });
    expect(clock.isInSync).toBe(false);
    clock.add({ offset: 251, delay: DIRECT_DELAY_MS - 2 });
    expect(clock.isInSync).toBe(IN_SYNC_SAMPLES <= 2);
    clock.add({ offset: 270, delay: 60 });
    expect(clock.best()).toEqual({ offset: 251, delay: 8 });
    expect(clock.isInSync).toBe(true);
  });

  it("R-14.7 a round trip under 10 ms, as on one Wi-Fi, bounds the error to 5 ms: direct", () => {
    const clock = new SharedClock(handClock().now);
    clock.add({ offset: 10, delay: 120 });
    expect(clock.isDirect).toBe(false);
    clock.add({ offset: 12, delay: DIRECT_DELAY_MS - 1 });
    expect(clock.isDirect).toBe(true);
  });

  it("R-14.1 only the last 16 exchanges count", () => {
    const clock = new SharedClock(handClock().now);
    clock.add({ offset: 100, delay: 1 });
    for (let index = 0; index < KEPT; index++) clock.add({ offset: 200, delay: 20 });
    expect(clock.best()).toEqual({ offset: 200, delay: 20 });
  });

  it("R-14.3 the first offset applies at once; a new one is eased in, never jumped", () => {
    const device = handClock();
    const clock = new SharedClock(device.now);
    clock.add({ offset: 250, delay: 6 });
    expect(clock.leaderNow()).toBe(1250);
    clock.add({ offset: 262, delay: 2 });
    expect(clock.applied()).toBe(250);
    device.advance(EASE_MS / 2);
    expect(clock.applied()).toBeCloseTo(256);
    device.advance(EASE_MS);
    expect(clock.applied()).toBe(262);
    expect(clock.toLocal(10_000)).toBe(10_000 - 262);
  });

  it("R-14.9 a lost connection keeps the clock it knows", () => {
    const device = handClock();
    const clock = new SharedClock(device.now);
    for (let index = 0; index < IN_SYNC_SAMPLES; index++) clock.add({ offset: -40, delay: 5 });
    device.advance(10 * 60 * 1000);
    expect(clock.leaderNow()).toBe(device.now() - 40);
    expect(clock.isInSync).toBe(true);
  });

  it("R-14.1 a broken exchange is ignored", () => {
    const clock = new SharedClock(handClock().now);
    clock.add({ offset: Number.NaN, delay: 3 });
    clock.add({ offset: 10, delay: -1 });
    expect(clock.isKnown).toBe(false);
  });
});
