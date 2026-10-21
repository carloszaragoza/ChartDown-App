import { describe, expect, it } from "vitest";
import { easings, nearestCard, stackTarget } from "./motion";

describe("T-2803 how the stack of sections moves", () => {
  it("R-03.12 both motions start at the start and end at the end", () => {
    for (const ease of Object.values(easings)) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
    }
    // Calm eases in and out, through the middle at half way.
    expect(easings.calm(0.5)).toBeCloseTo(0.5);
    // Soft bounce goes a little past the section, then settles.
    expect(Math.max(...[0.7, 0.8, 0.9].map(easings.bounce))).toBeGreaterThan(1);
  });

  it("R-03.12 a card's top lands in the active zone, never past the stack's ends", () => {
    const at = { stackTop: 100, scrollTop: 400, maxScroll: 2000, margin: 6 };
    expect(stackTarget({ ...at, cardTop: 700 })).toBe(994);
    expect(stackTarget({ ...at, cardTop: -500 })).toBe(0);
    expect(stackTarget({ ...at, cardTop: 5000 })).toBe(2000);
  });

  it("R-03.12 a settled scroll makes the card nearest the top the current one", () => {
    expect(nearestCard([-400, -20, 300, 900], 6)).toBe(1);
    expect(nearestCard([6, 400], 6)).toBe(0);
  });
});
