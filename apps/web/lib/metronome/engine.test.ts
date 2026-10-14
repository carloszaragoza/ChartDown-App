import { parse } from "chartdown";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clicks, Metronome, type Click } from "./engine";
import { timeline } from "./timeline";

// A 4-minute song: 76 bars of 4/4 at 76 bpm is exactly 240 seconds.
const fourMinutes = parse(
  `---\ntempo: 76\n---\n## A\n${Array.from({ length: 76 }, () => "1").join(" | ")}\n`,
);

/** A clock the test moves by hand, as the audio clock would advance. */
function fakeClock() {
  let seconds = 0;
  return { now: () => seconds, advance: (by: number) => (seconds += by) };
}

describe("T-1502 the metronome engine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("R-11.1 counts at the chart's tempo, or the one asked of the person when it has none", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\n---\n## A\n1 | 4\n")));
    expect(list.map((click) => click.time)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const none = timeline(parse("## A\n1\n"));
    expect(() => clicks(none)).toThrow(/no tempo/);
    expect(clicks(none, { tempo: 120 }).map((click) => click.time)).toEqual([0, 0.5, 1, 1.5]);
  });

  it("R-11.1 starts on any bar of the song", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\n---\n## A\n1 | 4 | 5\n")), { from: 2 });
    expect(list.map((click) => [click.bar, click.count])).toEqual([
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
    ]);
  });

  it("R-11.8 a count-in is one bar of the first bar's meter, accented on 1, before the song", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\nmeter: 3/4\n---\n## A\n1\n")), {
      countIn: true,
    });
    expect(list.map((click) => [click.bar, click.count, click.accent])).toEqual([
      [-1, 1, true],
      [-1, 2, false],
      [-1, 3, false],
      [0, 1, true],
      [0, 2, false],
      [0, 3, false],
    ]);
    expect(list[3]?.time).toBe(3);
  });

  it("R-11.12 the last beat of a 4-minute song lands within 20 ms", () => {
    const list = clicks(timeline(fourMinutes));
    const last = list[list.length - 1] as Click;
    expect(list).toHaveLength(76 * 4);
    expect(Math.abs(last.time - (76 * 4 - 1) * (60 / 76))).toBeLessThan(0.02);

    // Played: late, uneven timers never move a click off the audio clock.
    const clock = fakeClock();
    const sounded: number[] = [];
    const metronome = new Metronome(list, clock, (_, at) => sounded.push(at));
    metronome.start();
    const started = metronome.at(list[0] as Click);
    while (sounded.length < list.length) {
      clock.advance(0.025 + Math.random() * 0.04);
      vi.advanceTimersByTime(25 + Math.random() * 40);
    }
    expect(Math.abs(sounded[sounded.length - 1]! - started - 240 + 60 / 76)).toBeLessThan(0.02);
  });

  it("R-11.12 clicks are handed to the audio clock ahead of time, never late", () => {
    const list = clicks(timeline(parse("---\ntempo: 120\n---\n## A\n1 | 4\n")));
    const clock = fakeClock();
    const late: number[] = [];
    const metronome = new Metronome(list, clock, (_, at) => {
      if (at < clock.now()) late.push(at);
    });
    metronome.start();
    for (let step = 0; step < 200; step++) {
      clock.advance(0.025);
      vi.advanceTimersByTime(25);
    }
    expect(late).toEqual([]);
    expect(metronome.isPlaying).toBe(false);
  });

  it("R-11.14 the position follows the device's own clock: bar and beat for the pulse", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\n---\n## A\n1 | 4\n")));
    const clock = fakeClock();
    const metronome = new Metronome(list, clock);
    metronome.start();
    expect(metronome.position()).toBeUndefined();
    clock.advance(0.1 + 5.5);
    vi.advanceTimersByTime(5600);
    expect(metronome.position()).toMatchObject({ bar: 1, count: 2, of: 4 });
    metronome.stop();
    expect(metronome.position()).toBeUndefined();
  });
});
