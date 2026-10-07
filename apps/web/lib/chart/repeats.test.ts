import { describe, expect, it } from "vitest";
import { repeats } from "./repeats";

describe("T-1302 repeated sections in the song form", () => {
  it("T-1302 a section played more than once says which time it is", () => {
    expect(repeats(["I", "V1", "B1", "B1", "B1", "E"])).toEqual([
      { time: 1, of: 1 },
      { time: 1, of: 1 },
      { time: 1, of: 3 },
      { time: 2, of: 3 },
      { time: 3, of: 3 },
      { time: 1, of: 1 },
    ]);
  });
});
