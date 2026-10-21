import { describe, expect, it } from "vitest";
import { clampTempo, practiceTempo, speedForTempo, TEMPO_MAX, TEMPO_MIN } from "./practiceTempo";

describe("R-11.9 the tempo stepper", () => {
  it("R-11.9 T-2808 the stepper stays within 30 and 240 bpm, in whole beats", () => {
    expect(clampTempo(29)).toBe(TEMPO_MIN);
    expect(clampTempo(30)).toBe(30);
    expect(clampTempo(240)).toBe(240);
    expect(clampTempo(241)).toBe(TEMPO_MAX);
    expect(clampTempo(74.4)).toBe(74);
  });

  it("R-11.9 T-2808 a step of the stepper is a speed that plays that tempo", () => {
    expect(practiceTempo(71, speedForTempo(74, 71))).toBe(74);
    expect(practiceTempo(71, 100)).toBe(71);
    // Past the range, the speed plays its edge.
    expect(practiceTempo(200, speedForTempo(300, 200))).toBe(240);
  });
});
