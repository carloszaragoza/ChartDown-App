import { describe, expect, it } from "vitest";
import {
  AWAKE_HZ,
  AWAKE_LEVEL,
  clickSamples,
  clickSounds,
  clickTone,
  DEFAULT_SOUND,
  faders,
  getSound,
  parseSound,
  type SoundSettings,
} from "./sound";

describe("T-1505 the click", () => {
  it("R-11.7 the click is off by default, with no count-in", () => {
    expect(DEFAULT_SOUND).toEqual({
      click: false,
      beat: 70,
      eighths: null,
      sixteenths: 0,
      countIn: false,
      beatLine: "steps",
      keepAwake: true,
    });
    // Where nothing is stored (or storage is blocked), the defaults hold.
    expect(getSound()).toEqual(DEFAULT_SOUND);
  });

  it("R-11.7 beat 1 is accented: higher and louder than the others", () => {
    const one = clickTone("accent", 70);
    const other = clickTone("beat", 70);
    expect(one.frequency).toBeGreaterThan(other.frequency);
    expect(one.peak).toBeGreaterThan(other.peak);
  });

  it("R-11.7 the volume scales the click, and at 0 nothing plays", () => {
    expect(clickTone("accent", 50).peak).toBeCloseTo(clickTone("accent", 100).peak / 2);
    expect(clickTone("accent", 0).peak).toBe(0);
  });
});

describe("T-2816 the beat line", () => {
  it("R-11.3 moves in steps by default, smoothly when chosen, and anything else is steps", () => {
    expect(parseSound(null).beatLine).toBe("steps");
    expect(parseSound('{"beatLine":"smooth"}').beatLine).toBe("smooth");
    expect(parseSound('{"beatLine":"wobble"}').beatLine).toBe("steps");
    // Settings saved before the choice existed keep the rest and move in steps.
    expect(parseSound('{"click":true,"volume":40}')).toEqual({
      click: true,
      beat: 40,
      eighths: null,
      sixteenths: 0,
      countIn: false,
      beatLine: "steps",
      keepAwake: true,
    });
  });
});

describe("T-2817 the click in 6/8 and 12/8", () => {
  it("R-11.7 the start of each group of three sounds between beat 1 and the other eighths", () => {
    const [one, group, other] = (["accent", "group", "beat"] as const).map((level) =>
      clickTone(level, 70),
    );
    expect(group?.frequency).toBeLessThan(one?.frequency ?? 0);
    expect(group?.frequency).toBeGreaterThan(other?.frequency ?? 0);
    expect(group?.peak).toBeLessThan(one?.peak ?? 0);
    expect(group?.peak).toBeGreaterThan(other?.peak ?? 0);
  });
});

describe("T-2820 every click sounds the same", () => {
  it("R-11.7 a click is drawn once: 50 ms that rise in 2 ms from silence and fade back to it", () => {
    const samples = clickSamples(48_000, 1000);
    expect(samples).toHaveLength(2400);
    expect(samples[0]).toBe(0);
    const peak = Math.max(...Array.from(samples, Math.abs));
    expect(peak).toBeGreaterThan(0.9);
    expect(peak).toBeLessThanOrEqual(1);
    expect(Math.abs(samples.at(-1) ?? 1)).toBeLessThan(0.001);
    // The same samples every time: nothing is left to the moment it plays.
    expect(clickSamples(48_000, 1000)).toEqual(samples);
  });
});

describe("T-2820 the speakers stay awake between clicks", () => {
  it("R-11.7 with a hum far below hearing: 40 Hz, about -66 dB", () => {
    expect(AWAKE_HZ).toBeLessThanOrEqual(40);
    expect(20 * Math.log10(AWAKE_LEVEL)).toBeLessThan(-60);
    expect(AWAKE_LEVEL).toBeGreaterThan(0);
  });
});

describe("T-2820 keeping the speakers awake is a choice", () => {
  it("R-11.7 on by default and for settings saved before; off only when turned off", () => {
    expect(parseSound(null).keepAwake).toBe(true);
    expect(parseSound('{"click":true}').keepAwake).toBe(true);
    expect(parseSound('{"keepAwake":false}').keepAwake).toBe(false);
  });
});

describe("T-2845 subdivisions in the click", () => {
  const FOUR = { beats: 4, unit: 4 };
  const SIX = { beats: 6, unit: 8 };
  const beat = { accent: false, duration: 0.8 };
  const mix = (levels: Partial<SoundSettings>): SoundSettings => ({ ...DEFAULT_SOUND, ...levels });

  it("R-11.17 with every fader up a 4/4 beat sounds four clicks, evenly spaced, the first the beat's", () => {
    const sounds = clickSounds(beat, FOUR, mix({ beat: 70, eighths: 50, sixteenths: 30 }));
    expect(sounds.map((each) => Number(each.offset.toFixed(6)))).toEqual([0, 0.2, 0.4, 0.6]);
    expect(sounds.map((each) => each.level)).toEqual(["beat", "split", "split", "split"]);
    expect(sounds.map((each) => each.volume)).toEqual([70, 30, 50, 30]);
  });

  it("R-11.17 the subdivisions are a lighter sound of their own, never heard as a beat", () => {
    const split = clickTone("split", 70);
    expect(split.frequency).not.toBe(clickTone("beat", 70).frequency);
    expect(split.peak).toBeLessThan(clickTone("beat", 70).peak);
  });

  it("R-11.17 a fader at 0 sounds nothing, and beat 1 keeps its accent", () => {
    expect(clickSounds(beat, FOUR, mix({ beat: 0, eighths: 0 }))).toEqual([]);
    expect(clickSounds({ ...beat, accent: true }, FOUR, mix({ eighths: 40 }))).toEqual([
      { offset: 0, level: "accent", volume: 70 },
      { offset: 0.4, level: "split", volume: 40 },
    ]);
  });

  it("R-11.17 6/8 with the settings saved before sounds every eighth, as before", () => {
    const before = parseSound('{"click":true,"volume":60}');
    const bar = [true, false, false, true, false, false].map((onBeat, at) =>
      clickSounds(
        { accent: at === 0, ...(onBeat && at > 0 ? { group: true as const } : {}), duration: 0.3 },
        SIX,
        before,
      ),
    );
    expect(bar.map((sounds) => sounds.map((each) => [each.level, each.volume]))).toEqual([
      [["accent", 60]],
      [["beat", 60]],
      [["beat", 60]],
      [["group", 60]],
      [["beat", 60]],
      [["beat", 60]],
    ]);
  });

  it("R-11.17 in 6/8 the beat is the group of three, Eighths the other two, Sixteenths between", () => {
    const levels = mix({ beat: 80, eighths: 0, sixteenths: 20 });
    expect(clickSounds({ accent: false, group: true, duration: 0.3 }, SIX, levels)).toEqual([
      { offset: 0, level: "group", volume: 80 },
      { offset: 0.15, level: "split", volume: 20 },
    ]);
    expect(clickSounds({ accent: false, duration: 0.3 }, SIX, levels)).toEqual([
      { offset: 0.15, level: "split", volume: 20 },
    ]);
  });

  it("R-11.17 the saved volume becomes Beat, and Eighths follows the meter until it is moved", () => {
    const before = parseSound('{"volume":45}');
    expect(faders(before, FOUR)).toEqual({ beat: 45, eighths: 0, sixteenths: 0 });
    expect(faders(before, SIX)).toEqual({ beat: 45, eighths: 45, sixteenths: 0 });
    const moved = parseSound('{"beat":45,"eighths":10,"sixteenths":120}');
    expect(faders(moved, SIX)).toEqual({ beat: 45, eighths: 10, sixteenths: 100 });
  });

  it("R-11.17 the last beat of a fermata's bar sounds alone as it holds", () => {
    const held = clickSounds({ ...beat, waits: true }, FOUR, mix({ eighths: 50, sixteenths: 50 }));
    expect(held).toEqual([{ offset: 0, level: "beat", volume: 70 }]);
  });
});
