import { parse } from "chartdown";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clicks, continueWith, Metronome, sectionEnd, START_DELAY, type Click } from "./engine";
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

  it("R-11.9 at 80% speed a 60 bpm chart counts every 1.25 s, and the chart stays as written", () => {
    const chart = parse("---\ntempo: 60\n---\n## A\n1\n");
    const list = clicks(timeline(chart), { speed: 0.8 });
    expect(list.map((click) => click.time)).toEqual([0, 1.25, 2.5, 3.75]);
    expect(chart.tempo).toBe(60);
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

describe("T-1509 the musician leads the form", () => {
  // A Verse and a Chorus of two bars and a one-bar Outro, at 60 bpm: a beat a second.
  const song = timeline(
    parse("---\ntempo: 60\n---\n## Verse\n1 | 4\n## Chorus\n5 | 1\n## Outro\n4\n"),
  );
  const where = (list: readonly Click[]) =>
    list.map((click) => `${song[click.bar]?.section}.${song[click.bar]?.number}@${click.time}`);
  const firstOf = (section: number) => song.findIndex((bar) => bar.section === section);

  it("R-11.15 the section that sounds ends where its last beat ends", () => {
    const list = clicks(song);
    expect(sectionEnd(list, song, 0)).toBe(8);
    expect(sectionEnd(list, song, 9)).toBe(16);
  });

  it("R-11.15 choosing the Chorus while it plays repeats it from bar 1, on the beat", () => {
    const list = clicks(song);
    const { list: after, at } = continueWith(list, song, 10, clicks(song, { from: firstOf(1) }));
    expect(at).toBe(16);
    // The Chorus ends at 16 s, starts again at 16 s and then the Outro follows.
    expect(where(after.slice(14, 18))).toEqual(["1.2@14", "1.2@15", "1.1@16", "1.1@17"]);
    expect(where(after.slice(24, 25))).toEqual(["2.1@24"]);
  });

  it("R-11.15 choosing another section plays it after the one that sounds, then the form goes on", () => {
    const { list: after } = continueWith(clicks(song), song, 2, clicks(song, { from: firstOf(2) }));
    // The Verse ends at 8 s; the Outro follows at once and the song ends after it.
    expect(where(after.slice(7, 9))).toEqual(["0.2@7", "2.1@8"]);
    expect(after).toHaveLength(12);
  });

  it("R-11.15 a click already handed to the audio clock never changes", () => {
    const list = clicks(song);
    const { at } = continueWith(list, song, 7, clicks(song, { from: firstOf(2) }), 9);
    expect(at).toBe(9);
  });
});

describe("T-1504 a fermata waits for a tap", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("R-11.6 playback holds after a fermata bar until the tap, then goes on in time", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\n---\n## A\n1 | 4~ | 5\n")));
    expect(list.filter((click) => click.waits).map((click) => [click.bar, click.count])).toEqual([
      [1, 4],
    ]);
    const clock = fakeClock();
    const sounded: number[] = [];
    const metronome = new Metronome(list, clock, (click) => sounded.push(click.bar));
    metronome.start();
    // Twenty seconds go by: the first two bars play, then nothing.
    for (let step = 0; step < 800; step++) {
      clock.advance(0.025);
      vi.advanceTimersByTime(25);
    }
    expect(sounded).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    expect(metronome.isWaiting).toBe(true);
    expect(metronome.position()).toMatchObject({ bar: 1, count: 4 });
    // The tap: bar 3 starts a moment later, and its beats keep the tempo.
    metronome.resume();
    const resumedAt = clock.now();
    const times: number[] = [];
    for (let step = 0; step < 200; step++) {
      clock.advance(0.025);
      vi.advanceTimersByTime(25);
      const click = metronome.position();
      if (click?.bar === 2 && times.length < click.count) times.push(clock.now() - resumedAt);
    }
    expect(sounded.slice(8)).toEqual([2, 2, 2, 2]);
    expect(metronome.isWaiting).toBe(false);
    expect(times[0]).toBeLessThan(0.2);
    expect((times[3] ?? 0) - (times[0] ?? 0)).toBeCloseTo(3, 1);
  });
});

describe("T-2817 the metronome in 6/8 and 12/8", () => {
  it("R-11.5 the tempo counts the dotted quarter: each of the six eighths lasts a third of it", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\nmeter: 6/8\n---\n## A\n1\n")));
    expect(list.map((click) => click.count)).toEqual([1, 2, 3, 4, 5, 6]);
    list.forEach((click, at) => expect(click.time).toBeCloseTo(at / 3));
    // A bar of 6/8 at 60 is two beats: two seconds.
    expect((list.at(-1)?.time ?? 0) + (list.at(-1)?.duration ?? 0)).toBeCloseTo(2);
  });

  it("R-11.5 12/8 at 68 is four beats of 68 a bar, and 3/4 and 4/4 count quarters as before", () => {
    const twelve = clicks(timeline(parse("---\ntempo: 68\nmeter: 12/8\n---\n## A\n1\n")));
    expect(twelve).toHaveLength(12);
    expect(twelve[1]?.time).toBeCloseTo(60 / 68 / 3);
    const three = clicks(timeline(parse("---\ntempo: 60\nmeter: 3/4\n---\n## A\n1\n")));
    expect(three.map((click) => click.time)).toEqual([0, 1, 2]);
  });

  it("R-11.7 R-11.8 beat 1 is accented and each group of three starts a little stronger, count-in too", () => {
    const list = clicks(timeline(parse("---\ntempo: 60\nmeter: 6/8\n---\n## A\n1\n")), {
      countIn: true,
    });
    const marks = list.map((click) => (click.accent ? "1" : click.group ? "g" : "."));
    expect(marks.join("")).toBe("1..g..1..g..");
    const four = clicks(timeline(parse("---\ntempo: 60\n---\n## A\n1\n")));
    expect(four.some((click) => click.group)).toBe(false);
  });
});

describe("T-2822 Play starts at once", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("R-11.12 the first click sounds 30 ms after Play, handed over at once", () => {
    const clock = fakeClock();
    clock.advance(5);
    const sounded: number[] = [];
    const list = clicks(timeline(parse("---\ntempo: 60\n---\n## A\n1\n")));
    const metronome = new Metronome(list, clock, (_, at) => sounded.push(at));
    metronome.start();
    expect(sounded[0]).toBeCloseTo(5 + START_DELAY);
    expect(START_DELAY).toBeLessThanOrEqual(0.03);
    metronome.stop();
  });
});

describe("T-2825 a tempo's beat unit (ChartDown 0.9)", () => {
  const barLength = (source: string, options = {}) => {
    const list = clicks(timeline(parse(source)), options);
    const last = list.at(-1);
    return (last?.time ?? 0) + (last?.duration ?? 0);
  };

  it("R-11.5 R-00.18 58 q., 87 q and 174 e in 6/8 play at the same speed", () => {
    const sixEight = (tempo: string) =>
      barLength(`---\nmeter: 6/8\ntempo: ${tempo}\n---\n## A\n1\n`);
    // Six eighths at 174 a minute.
    expect(sixEight("58 q.")).toBeCloseTo((6 * 60) / 174);
    expect(sixEight("87 q")).toBeCloseTo((6 * 60) / 174);
    expect(sixEight("174 e")).toBeCloseTo((6 * 60) / 174);
    expect(sixEight("58")).toBeCloseTo((6 * 60) / 174);
  });

  it("R-11.5 a unit in 4/4 still clicks each quarter, at the speed the unit says", () => {
    const list = clicks(timeline(parse("---\ntempo: 60 h\n---\n## A\n1\n")));
    expect(list).toHaveLength(4);
    // 60 half notes a minute: a quarter every half second.
    expect(list[1]?.time).toBeCloseTo(0.5);
  });

  it("R-11.16 a tempo with ? plays only as the person chose", () => {
    const bars = timeline(parse("---\nmeter: 6/8\ntempo: 58 ?\n---\n## A\n1\n"));
    expect(bars[0]?.unconfirmed).toBe(true);
    expect(bars[0]?.unit).toBeUndefined();
    const dotted = clicks(bars, { unit: "q." });
    const eighth = clicks(bars, { unit: "e" });
    expect(dotted[1]?.time).toBeCloseTo(60 / 174);
    expect(eighth[1]?.time).toBeCloseTo(60 / 58);
  });
});
