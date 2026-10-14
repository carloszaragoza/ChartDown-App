import { describe, expect, it } from "vitest";
import { speedFor, tapTempo } from "./tapTempo";

describe("T-1506 practice tempo and tap tempo", () => {
  it("R-11.9 four taps half a second apart are 120 bpm", () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
  });

  it("R-11.9 one uneven tap doesn't throw the tempo", () => {
    expect(tapTempo([0, 600, 1200, 1500, 2400, 3000])).toBe(100);
  });

  it("R-11.9 a pause starts a new count; one tap alone is no tempo yet", () => {
    expect(tapTempo([0, 500, 4000])).toBeNull();
    expect(tapTempo([0, 500, 4000, 4750])).toBe(80);
    expect(tapTempo([])).toBeNull();
  });

  it("R-11.9 80% speed plays at 80% of the chart's tempo; a tapped tempo becomes a speed", () => {
    expect(76 * 0.8).toBeCloseTo(60.8);
    expect(speedFor(60, 76)).toBeCloseTo(0.789, 3);
  });
});
