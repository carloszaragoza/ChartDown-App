import { describe, expect, it } from "vitest";
import { fitScale, pinchLayout, SONG_MIN_SCALE } from "./fit";

describe("T-2823 the whole song fits the screen", () => {
  it("R-03.12 the numbers stay at the chosen size when the song fits", () => {
    expect(fitScale(1, () => true)).toBe(1);
  });

  it("R-03.12 they shrink step by step until the song fits", () => {
    expect(fitScale(1, (scale) => scale <= 0.8)).toBe(0.8);
    expect(fitScale(1.15, (scale) => scale <= 0.9)).toBe(0.9);
  });

  it("R-03.12 never below a size that reads from the stand: past it, the song scrolls", () => {
    expect(fitScale(1, () => false)).toBe(SONG_MIN_SCALE);
  });

  it("R-03.12 two fingers closing show the whole song, opening one section at a time", () => {
    expect(pinchLayout(0.6, "sections")).toBe("song");
    expect(pinchLayout(1.5, "song")).toBe("sections");
    expect(pinchLayout(0.95, "sections")).toBe("sections");
    expect(pinchLayout(1.1, "song")).toBe("song");
  });
});
