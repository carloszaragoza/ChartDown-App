import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { timeline } from "../metronome/timeline";
import { copyAt } from "./copies";

describe("T-2704 which time a reused section is playing", () => {
  const chart = parse(
    "---\ntempo: 120\n---\n## Bridge\n4 | 5\n## Again\n@use Bridge 3x\n## Rep\n|: 1 | 4 :|\n",
  );
  const bars = timeline(chart);
  it("R-00.17 a section reused 3 times counts its times", () => {
    // Again plays Bridge's two bars three times: timeline places 2 to 7.
    expect([2, 3, 4, 5, 6, 7].map((at) => copyAt(bars, at))).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it("R-00.17 a repeat's second pass is not a new time", () => {
    expect([8, 9, 10, 11].map((at) => copyAt(bars, at))).toEqual([1, 1, 1, 1]);
  });
});
