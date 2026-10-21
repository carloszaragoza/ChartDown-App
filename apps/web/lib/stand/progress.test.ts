import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { timeline } from "../metronome/timeline";
import { barProgress } from "./progress";

const each = (content: string) => {
  const bars = timeline(parse(content));
  return bars.map((_, at) => barProgress(bars, at));
};

describe("T-2804 which bar of the section is playing", () => {
  it("R-03.12 a repeat goes on counting through its second pass", () => {
    expect(each("---\ntempo: 90\n---\n## Verse\n|: 1 | 4 :|\n## Chorus\n5 | 1\n")).toEqual([
      { bar: 1, of: 4 },
      { bar: 2, of: 4 },
      { bar: 3, of: 4 },
      { bar: 4, of: 4 },
      { bar: 1, of: 2 },
      { bar: 2, of: 2 },
    ]);
  });

  it("R-03.12 a 2/4 bar is one bar, and each copy of a counted section counts afresh", () => {
    const counted = each(
      "---\ntempo: 90\n---\n## Bridge\n4 | [m:2/4] 5 | 1\n## Bridges\n@use Bridge 2x\n",
    );
    expect(counted.slice(0, 3)).toEqual([
      { bar: 1, of: 3 },
      { bar: 2, of: 3 },
      { bar: 3, of: 3 },
    ]);
    expect(counted.slice(3)).toEqual([
      { bar: 1, of: 3 },
      { bar: 2, of: 3 },
      { bar: 3, of: 3 },
      { bar: 1, of: 3 },
      { bar: 2, of: 3 },
      { bar: 3, of: 3 },
    ]);
  });
});
