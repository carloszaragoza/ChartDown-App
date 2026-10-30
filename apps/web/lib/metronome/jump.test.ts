import { describe, expect, it } from "vitest";
import { jumpTarget } from "./jump";

// Intro (2 bars), Verse (4 bars, its last two repeated), Chorus (2 bars), Verse again.
const bar = (section: number, number: number, pass = 1) => ({ section, number, pass });
const bars = [
  bar(0, 1),
  bar(0, 2),
  bar(1, 1),
  bar(1, 2),
  bar(1, 3, 1),
  bar(1, 4, 1),
  bar(1, 3, 2),
  bar(1, 4, 2),
  bar(2, 1),
  bar(2, 2),
  bar(1, 1),
  bar(1, 2),
  bar(1, 3, 1),
  bar(1, 4, 1),
  bar(1, 3, 2),
  bar(1, 4, 2),
];

describe("R-11.18 a tap on a bar moves the playing metronome there", () => {
  it("R-11.18 in the section playing, the bar of the pass playing, ahead or behind", () => {
    expect(jumpTarget(bars, 1, 4, 2)).toBe(5);
    expect(jumpTarget(bars, 1, 1, 5)).toBe(2);
    // In the repeat's second pass, its bars stay in that pass.
    expect(jumpTarget(bars, 1, 3, 7)).toBe(6);
  });

  it("R-11.18 the second time a section plays, the tap stays in that time", () => {
    expect(jumpTarget(bars, 1, 2, 12)).toBe(11);
  });

  it("R-11.18 another section's bar is its next time ahead", () => {
    expect(jumpTarget(bars, 2, 2, 3)).toBe(9);
    // From the Chorus, the Verse comes again ahead.
    expect(jumpTarget(bars, 1, 2, 8)).toBe(11);
  });

  it("R-11.18 going back to a section that doesn't come again takes its last time", () => {
    expect(jumpTarget(bars, 0, 2, 12)).toBe(1);
    expect(jumpTarget(bars, 2, 1, 14)).toBe(8);
  });

  it("R-11.18 a bar the play order never reaches goes nowhere", () => {
    expect(jumpTarget(bars, 3, 1, 0)).toBeNull();
  });
});
