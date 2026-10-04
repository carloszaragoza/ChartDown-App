import { describe, expect, it } from "vitest";
import { sectionLength } from "./length.js";
import { parse } from "./parse.js";
import { fixture } from "./test-helpers.js";

const length = (rows: string) => {
  const section = parse(`## A\n${rows}`).sections[0];
  if (!section) throw new Error("no section");
  return sectionLength(section);
};

describe("sectionLength", () => {
  it("counts the written bars of a section without repeats", () => {
    expect(length("1 | 4 | 5 | 1\n6m | 4")).toEqual({ perPass: 6, times: 1, total: 6 });
  });

  it("gives a whole-section repeat as bars per pass and passes", () => {
    expect(length("|: 1 | 4 | 5 | 1 :| x3")).toEqual({ perPass: 4, times: 3, total: 12 });
    expect(length("1 | 4 :|")).toEqual({ perPass: 2, times: 2, total: 4 });
  });

  it("plays each pass's own ending: the Open Road bridge is 4 bars twice", () => {
    expect(length("|: 6m | 4 | 1 | [1] 5 :| x2\n[2] 5 4 5 5 |")).toEqual({
      perPass: 4,
      times: 2,
      total: 8,
    });
  });

  it("adds bars outside a repeat once, and then gives only the total", () => {
    expect(length("1 | 4\n|: 5 | 1 :|")).toEqual({ perPass: 6, times: 1, total: 6 });
    expect(length("|: 5 | 1 :|\n4 | 1")).toEqual({ perPass: 6, times: 1, total: 6 });
  });

  it("unrolls several repeats in one section", () => {
    expect(length("|: 1 | 4 :|\n|: 5 | 1 :| x3")).toEqual({ perPass: 10, times: 1, total: 10 });
  });

  it("gives the total when passes differ in length", () => {
    expect(length("|: 1 | [1] 4 :| x2\n[2] 5 | 1")).toEqual({ perPass: 5, times: 1, total: 5 });
  });

  it("matches the Open Road song map of the approved design", () => {
    const chart = parse(fixture("open-road"));
    const labels = chart.sections.map((section) => {
      const { perPass, times } = sectionLength(section);
      return times > 1 ? `${perPass}×${times}` : `${perPass}`;
    });
    expect(labels).toEqual(["4", "8", "8", "8", "8", "4×2", "8"]);
  });

  it("is 0 for a section with no bars", () => {
    expect(sectionLength({ name: "Empty", line: 1, notes: [], rows: [] })).toEqual({
      perPass: 0,
      times: 1,
      total: 0,
    });
  });
});
