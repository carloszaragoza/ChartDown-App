import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";

describe("R-00.5 no CCLI in ChartDown (decision 10)", () => {
  it("R-00.5 the parser gives a ccli field no meaning: it is not a property of the chart", () => {
    const chart = parse("---\ntitle: Open Road\nccli: 1234567\n---\n## Verse\n1 | 4\n");
    expect(Object.keys(chart)).not.toContain("ccli");
    expect(JSON.stringify({ ...chart, header: {} })).not.toMatch(/ccli/i);
    // Like any field the language does not define, it is only kept as written in the header.
    expect(chart.header.ccli).toBe("1234567");
  });

  it("R-00.5 no conformance case or example uses CCLI", () => {
    const folder = new URL("../conformance/", import.meta.url);
    for (const name of readdirSync(folder)) {
      expect(readFileSync(new URL(name, folder), "utf8"), name).not.toMatch(/ccli/i);
    }
  });
});
