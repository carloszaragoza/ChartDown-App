import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { timeline } from "../metronome/timeline";
import { copyAt, drawnRows } from "./copies";

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

describe("T-2839 a section reused with a count is drawn as a written repeat", () => {
  it("R-00.17 its bars between repeat signs, ×2 at the end; a section with its own repeat stays as written", () => {
    const chart = parse(
      "## Chorus\n1 | 4\n5 | 1\n## Again\n@use Chorus 2x\n## Loop\n|: 1 | 4 :|\n## Loop again\n@use Loop 2x\n",
    );
    const [chorus, again, , loopAgain] = chart.sections;
    const rows = drawnRows(again!);
    expect(rows[0]?.bars[0]?.repeatStart).toBe(true);
    expect(rows[1]?.bars[1]?.repeatEnd).toEqual({ times: 2 });
    expect(rows.flatMap((row) => row.bars).filter((bar) => bar.repeatStart)).toHaveLength(1);
    expect(drawnRows(chorus!)).toBe(chorus?.rows);
    expect(drawnRows(loopAgain!)).toBe(loopAgain?.rows);
  });
});
