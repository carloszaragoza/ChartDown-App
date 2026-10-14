import { parse } from "chartdown";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasJump, playRuns } from "./playRuns";

const northbound = readFileSync(
  new URL("../../../../fixtures/northbound-0.6.chartdown", import.meta.url),
  "utf8",
);

describe("R-00.9 the play order shown with the song form", () => {
  it("R-00.9 a song with a D.S. al Coda has its play order, with the bars of a part-played section", () => {
    const chart = parse(northbound);
    expect(hasJump(chart)).toBe(true);
    const names = playRuns(chart).map((run) => [
      chart.sections[run.section]?.name,
      run.full ? "all" : `${run.from}-${run.to}`,
    ]);
    expect(names).toEqual([
      ["Intro", "all"],
      ["Verse", "all"],
      ["Chorus", "all"],
      ["Bridge", "all"],
      ["Verse", "all"],
      ["Chorus", "1-7"],
      ["Outro", "all"],
    ]);
  });

  it("R-00.9 a song with no jump, or a jump with no target, has no play order line", () => {
    expect(hasJump(parse("## A\n|: 1 | [1] 4 :| 2x\n[2] 5"))).toBe(false);
    expect(hasJump(parse("## A\n1 | 4 {D.S.}"))).toBe(false);
  });
});
