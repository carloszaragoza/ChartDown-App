import { describe, expect, it } from "vitest";
import { clickTone, DEFAULT_SOUND, getSound, parseSound } from "./sound";

describe("T-1505 the click", () => {
  it("R-11.7 the click is off by default, with no count-in", () => {
    expect(DEFAULT_SOUND).toEqual({ click: false, volume: 70, countIn: false, beatLine: "steps" });
    // Where nothing is stored (or storage is blocked), the defaults hold.
    expect(getSound()).toEqual(DEFAULT_SOUND);
  });

  it("R-11.7 beat 1 is accented: higher and louder than the others", () => {
    const one = clickTone(true, 70);
    const other = clickTone(false, 70);
    expect(one.frequency).toBeGreaterThan(other.frequency);
    expect(one.peak).toBeGreaterThan(other.peak);
  });

  it("R-11.7 the volume scales the click, and at 0 nothing plays", () => {
    expect(clickTone(true, 50).peak).toBeCloseTo(clickTone(true, 100).peak / 2);
    expect(clickTone(true, 0).peak).toBe(0);
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
    });
  });
});
