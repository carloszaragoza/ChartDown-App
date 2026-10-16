import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { formStripItems } from "./FormStrip";
import { playedLength } from "./played";

describe("T-2302 a section reused with a count", () => {
  it("R-00.17 a copy played 3x counts its bars per pass, three times", () => {
    const chart = parse("## Chorus\n4 | 1 | 5 | 6m\n## Chorus 2\n@use Chorus 3x\n");
    expect(playedLength(chart.sections[0]!)).toEqual({ perPass: 4, times: 1, total: 4 });
    expect(playedLength(chart.sections[1]!)).toEqual({ perPass: 4, times: 3, total: 12 });
    expect(formStripItems(chart, -1, () => false)[1]?.length.times).toBe(3);
  });

  it("R-00.17 a copied repeat played 2x multiplies its own passes", () => {
    const chart = parse("## Tag\n|: 4 | 5 :| 2x\n## Tag 2\n@use Tag 2x\n");
    expect(playedLength(chart.sections[1]!)).toEqual({ perPass: 2, times: 4, total: 8 });
  });
});
