import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { STARTER } from "./starter";

describe("T-605 a first chart is easy to start", () => {
  it("R-03.10 the starter has a key and two sections, and reads with no warnings", () => {
    const chart = parse(STARTER);
    expect(chart.warnings).toEqual([]);
    expect(chart.key).toEqual({ root: "G", minor: false });
    expect(chart.sections.map((section) => section.name)).toEqual(["Verse", "Chorus"]);
  });

  it("R-03.10 the same chart written in letters reads too, with no warnings", () => {
    const letters = STARTER.replace("1 | 4 | 6m | 5", "G | C | Em | D").replace(
      "4 | 1 | 5 | 1",
      "C | G | D | G",
    );
    const chart = parse(letters);
    expect(chart.warnings).toEqual([]);
    expect(chart.sections[0]?.rows[0]?.bars).toHaveLength(4);
  });
});
