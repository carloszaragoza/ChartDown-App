import { describe, expect, it } from "vitest";
import {
  AWAKE_HZ,
  AWAKE_LEVEL,
  clickSamples,
  clickTone,
  DEFAULT_SOUND,
  getSound,
  parseSound,
} from "./sound";

describe("T-1505 the click", () => {
  it("R-11.7 the click is off by default, with no count-in", () => {
    expect(DEFAULT_SOUND).toEqual({
      click: false,
      volume: 70,
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
      volume: 40,
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
