import { describe, expect, it } from "vitest";
import { parse, SUPPORTED_VERSION } from "./parse.js";
import { EXAMPLES, EXAMPLES_06, fixture, fixture06 } from "./test-helpers.js";
import type { Chart } from "./types.js";

const count = (chart: Chart) => ({
  sections: chart.sections.length,
  notes: chart.sections.reduce((total, s) => total + s.notes.length, 0),
  bars: chart.sections.reduce(
    (total, s) => total + s.rows.reduce((n, r) => n + r.bars.length, 0),
    0,
  ),
});

describe("R-00.3 the parser returns the chart as structured data", () => {
  it.each(EXAMPLES)("R-00.3 parses the Language example %s with no warnings", (name) => {
    expect(parse(fixture(name)).warnings).toEqual([]);
  });

  it("R-00.3 returns every section, note and bar of the examples", () => {
    expect(count(parse(fixture("lantern-bay")))).toEqual({ sections: 4, notes: 4, bars: 23 });
    expect(count(parse(fixture("open-road")))).toEqual({ sections: 7, notes: 13, bars: 49 });
    expect(count(parse(fixture("syntax-tour")))).toEqual({ sections: 8, notes: 10, bars: 37 });
  });

  it.each([...EXAMPLES, "edge-cases"])(
    "R-00.3 the chart %s survives a JSON round trip unchanged",
    (name) => {
      const chart = parse(fixture(name));
      expect(JSON.parse(JSON.stringify(chart))).toStrictEqual(chart);
    },
  );

  it("R-00.3 a parse does not depend on earlier parses", () => {
    const song = "## Verse\n> MD cello: Long notes.\n1 | 4";
    const before = parse(song);
    parse(fixture("edge-cases")); // declares cello as a custom instrument
    const after = parse(song);
    expect(after).toStrictEqual(before);
    expect(after.warnings.map((w) => w.code)).toEqual(["unknown-instrument"]);
  });

  it("R-00.3 bad input never throws and every warning has its line number", () => {
    const chart = parse(fixture("edge-cases"));
    expect(chart.warnings.map((w) => [w.line, w.code])).toEqual([
      [6, "instrument-id"],
      [7, "header-line"],
      [10, "no-section"],
      [16, "unknown-instrument"],
      [17, "bad-token"],
      [17, "beats-mismatch"],
      [20, "beats-mismatch"],
      [21, "landmark-too-long"],
      [22, "bad-token"],
      [23, "empty-bar"],
      [24, "unknown-directive"],
      [32, "use-not-found"],
    ]);
    for (const input of [
      "",
      "---",
      "---\nkey: H\n",
      "|||",
      "## \n:| x",
      "{",
      '"',
      "@key",
      "\u0000",
    ]) {
      expect(() => parse(input)).not.toThrow();
    }
  });

  it("R-00.3 warnings carry a code and values the app can translate", () => {
    const [warning] = parse("## A\n1 ? 4").warnings;
    expect(warning).toEqual({
      line: 2,
      code: "bad-token",
      message: "Can’t read “?”",
      values: { token: "?" },
    });
  });
});

describe("R-00.4 the header declares the format version", () => {
  it("R-00.4 returns the declared version", () => {
    const chart = parse("---\nchartdown: 0.4\n---\n## A\n1");
    expect(chart.version).toBe("0.4");
    expect(chart.warnings).toEqual([]);
  });

  it("R-00.4 warns when a chart declares a version the parser does not support", () => {
    expect(parse("---\nchartdown: 0.7\n---\n## A\n1").warnings).toEqual([
      {
        line: 2,
        code: "unsupported-version",
        message: "This chart says ChartDown 0.7; this parser reads 0.3–0.6",
        values: { version: "0.7", supported: "0.3–0.6" },
      },
    ]);
  });

  it.each(["0.3", "0.4", "0.5", "0.6"])(
    "R-00.4 a chart written for %s is read without a warning",
    (version) => {
      expect(parse(`---\nchartdown: ${version}\n---\n## A\n1`).warnings).toEqual([]);
    },
  );

  it("R-00.4 a missing version is not a warning", () => {
    const chart = parse("---\ntitle: Open Road\n---\n## A\n1");
    expect("version" in chart).toBe(false);
    expect(chart.warnings).toEqual([]);
  });

  it.each(EXAMPLES)("R-00.4 the 0.4 example %s is read without a warning", (name) => {
    const chart = parse(fixture(name));
    expect(chart.version).toBe("0.4");
    expect(chart.warnings).toEqual([]);
  });

  it.each(EXAMPLES_06)("R-00.4 the Language example %s declares the supported version", (name) => {
    expect(parse(fixture06(name)).version).toBe(SUPPORTED_VERSION);
  });
});

describe("parse", () => {
  it("reads the header, defaulting the key to C and the meter to 4/4", () => {
    const chart = parse("---\nTitle: Open Road\nkey: Em\nmeter: 6/8\n---\n## A\n1m");
    expect(chart.header).toEqual({ title: "Open Road", key: "Em", meter: "6/8" });
    expect(chart.key).toEqual({ root: "E", minor: true });
    expect(chart.meter).toEqual({ beats: 6, unit: 8 });
    expect(parse("## A\n1")).toMatchObject({
      key: { root: "C", minor: false },
      meter: { beats: 4, unit: 4 },
    });
  });

  it("reads plain notes, MD notes for everyone and MD notes per instrument", () => {
    const [section] = parse(
      "## Chorus\n> Watch the stops.\n> MD: Open it up.\n> MD bass, keys: Roots only.",
    ).sections;
    expect(section?.notes).toEqual([
      { md: false, roles: ["everyone"], passes: [], text: "Watch the stops.", line: 2 },
      { md: true, roles: ["everyone"], passes: [], text: "Open it up.", line: 3 },
      { md: true, roles: ["bass", "keys"], passes: [], text: "Roots only.", line: 4 },
    ]);
  });

  it("shows a note with an unknown instrument to everyone", () => {
    const chart = parse("## A\n> MD kazoo: Loud.");
    expect(chart.sections[0]?.notes[0]?.roles).toEqual(["everyone"]);
  });

  it("puts every row in its key and marks the row after @key", () => {
    const chart = parse("---\nkey: G\n---\n## A\n1\n@key Am\n1m\n4m\n## B\n5");
    const rows = chart.sections.flatMap((s) => s.rows);
    expect(rows.map((r) => r.key)).toEqual([
      { root: "G", minor: false },
      { root: "A", minor: true },
      { root: "A", minor: true },
      { root: "A", minor: true },
    ]);
    expect(rows.map((r) => r.keyChange)).toEqual([
      undefined,
      { root: "A", minor: true },
      undefined,
      undefined,
    ]);
  });

  it("@use copies the rows of an earlier section in the current key and keeps its own notes", () => {
    const chart = parse(
      "---\nkey: G\n---\n## Chorus\n4 | 1\n## Last\n> MD: Up a step.\n@key A\n## Chorus 2\n@use chorus",
    );
    const reused = chart.sections[2];
    expect(reused?.use).toEqual({ name: "chorus", line: 10 });
    expect(reused?.rows.map((r) => r.key)).toEqual([{ root: "A", minor: false }]);
    expect(reused?.rows[0]?.bars).toEqual(chart.sections[0]?.rows[0]?.bars);
    expect(reused?.rows[0]?.bars).not.toBe(chart.sections[0]?.rows[0]?.bars);
  });

  it("skips blank lines and // comments", () => {
    const chart = parse("// intro comment\n\n## A\n// not a row\n1");
    expect(chart.sections[0]?.rows).toHaveLength(1);
    expect(chart.warnings).toEqual([]);
  });

  it("reads Windows line endings", () => {
    expect(parse("---\r\nkey: D\r\n---\r\n## A\r\n1 | 4\r\n")).toMatchObject({
      key: { root: "D" },
      warnings: [],
    });
  });
});
