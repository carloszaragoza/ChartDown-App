import { describe, expect, it } from "vitest";
import { extractRequirementIds, parseDefinedRequirements } from "./requirements.ts";

describe("extractRequirementIds", () => {
  it("finds single ids among other references", () => {
    expect(extractRequirementIds("R-01.1, Technical Plan 12.1")).toEqual(["R-01.1"]);
    expect(extractRequirementIds("R-06.1, R-06.2, R-06.4")).toEqual(["R-06.1", "R-06.2", "R-06.4"]);
  });

  it("expands a range within one spec", () => {
    expect(extractRequirementIds("R-02.1 to R-02.3")).toEqual(["R-02.1", "R-02.2", "R-02.3"]);
  });

  it("returns nothing for references without requirement ids", () => {
    expect(extractRequirementIds("SPEC-02")).toEqual([]);
    expect(extractRequirementIds("Handoff 3")).toEqual([]);
  });
});

describe("parseDefinedRequirements", () => {
  it("reads the requirement list items of the SDD plan", () => {
    const plan = [
      "**Requirements**",
      "",
      "- R-06.1 When a musician opens a song from a set…",
      "- R-06.4 **The layer is private to the band.**",
      "",
      "Mentions of R-99.9 in prose do not define it.",
    ].join("\n");
    expect(parseDefinedRequirements(plan)).toEqual(new Set(["R-06.1", "R-06.4"]));
  });
});
