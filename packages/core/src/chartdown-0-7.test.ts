import { describe, expect, it } from "vitest";
import { canonicalQuality } from "./chord.js";
import { chordFormatter, degree, keyName } from "./display.js";
import { toJSON } from "./json.js";
import { parse } from "./parse.js";
import type { Chord } from "./types.js";

const chords = (source: string): Chord[] =>
  parse(source).sections.flatMap((section) =>
    section.rows.flatMap((row) =>
      row.bars.flatMap((bar) => bar.items.filter((item): item is Chord => item.type === "chord")),
    ),
  );
const shown = (source: string, style: "numbers" | "letters") => {
  const chart = parse(source);
  const formatter = chordFormatter(chart, { style });
  return chart.sections.flatMap((section) =>
    section.rows.map((row) =>
      row.bars
        .map((bar) =>
          bar.items
            .map((item) => (item.type === "chord" ? formatter.chord(item, row).text : ""))
            .join(" "),
        )
        .join(" | "),
    ),
  );
};

describe("R-00.13 chord qualities take their canonical form (spec 6)", () => {
  it.each([
    ["-", "m"],
    ["-7", "m7"],
    ["min", "m"],
    ["mi7", "m7"],
    ["ø", "m7b5"],
    ["ø7", "m7b5"],
    ["°", "dim"],
    ["o", "dim"],
    ["°7", "dim7"],
    ["o7", "dim7"],
    ["+", "aug"],
    ["Δ", "maj7"],
    ["Δ9", "maj9"],
    ["M7", "maj7"],
    ["ma9", "maj9"],
    ["sus4", "sus"],
    ["7(b9)", "7b9"],
    ["m(maj7)", "mmaj7"],
  ])("R-00.13 the alias %s is %s", (written, canonical) => {
    expect(canonicalQuality(written)).toBe(canonical);
  });

  it("R-00.13 qualities in the vocabulary keep their spelling, M, ma and maj alone are not aliases", () => {
    for (const quality of [
      "",
      "m",
      "7",
      "maj7",
      "m7b5",
      "dim7",
      "7#9",
      "9sus",
      "madd9",
      "13#11",
      "5",
    ])
      expect(canonicalQuality(quality)).toBe(quality);
    expect(canonicalQuality("M")).toBe("M");
    expect(canonicalQuality("ma")).toBe("ma");
    expect(canonicalQuality("maj")).toBe("maj");
  });

  it("R-00.13 a quality outside the vocabulary passes through as written, with no warning", () => {
    const chart = parse("## A\n1blue | 4-in");
    expect(chords("## A\n1blue | 4-in").map((chord) => chord.quality)).toEqual(["blue", "min"]);
    expect(chart.warnings).toEqual([]);
  });

  it("R-00.13 number style shows - for every canonical minor quality", () => {
    expect(shown("## A\n7ø | 1m(maj7) | 6min | 2-7", "numbers")).toEqual([
      "7-7b5 | 1-maj7 | 6- | 2-7",
    ]);
    expect(shown("## A\n1maj7 | 4M7", "numbers")).toEqual(["1maj7 | 4maj7"]);
  });
});

describe("R-00.14 numbering: 6m counts a minor key from its relative major (spec 3 and 12)", () => {
  const em = "---\nkey: Em\nnumbering: 6m\n---\n## A\n6m | 1 | 4 | 37\n";

  it("R-00.14 in Em, 6m is the tonic and 1 is G", () => {
    const chart = parse(em);
    expect(chart.numbering).toBe("6m");
    const key = chart.key;
    expect(degree("6", key, "6m")).toBe(0);
    expect(degree("1", key, "6m")).toBe(3);
    expect(shown(em, "letters")).toEqual(["Em | G | C | B7"]);
  });

  it("R-00.14 a 6m chart shows the same letters as its 1m version", () => {
    const oneM = "---\nkey: Em\n---\n## A\n1m | b3 | b6 | 57\n";
    expect(shown(em, "letters")).toEqual(shown(oneM, "letters"));
  });

  it("R-00.14 letters shown as numbers count from the relative major in a 6m minor row", () => {
    expect(shown("---\nkey: Em\nnumbering: 6m\n---\n## A\nEm | G | C | B7\n", "numbers")).toEqual([
      "6- | 1 | 4 | 37",
    ]);
  });

  it("R-00.14 major rows are not moved, and a key change to minor is", () => {
    const chart = parse("---\nkey: C\nnumbering: 6m\n---\n## A\n1 | 6m\n@key Am\n## B\n6m | 1\n");
    expect(
      shown("---\nkey: C\nnumbering: 6m\n---\n## A\n1 | 6m\n@key Am\n## B\n6m | 1\n", "letters"),
    ).toEqual(["C | Am", "Am | C"]);
    expect(chart.sections.map((section) => keyName(section.rows[0]!.key))).toEqual(["C", "Am"]);
  });

  it("R-00.14 the field is read in any case; any value but 1m or 6m is a warning on its line, and 1m is used", () => {
    expect(parse("---\nnumbering: 6M\nkey: Em\n---\n## A\n1").numbering).toBe("6m");
    const chart = parse("---\nkey: Em\nnumbering: 3m\n---\n## A\n1");
    expect(chart.numbering).toBe("1m");
    expect(chart.warnings.map(({ line, code }) => ({ line, code }))).toEqual([
      { line: 3, code: "bad-numbering" },
    ]);
  });
});

describe("R-00.15 the JSON form of ChartDown 0.7 (Appendix A)", () => {
  it("R-00.15 numbering at the top, minor on every row, the canonical quality, and degrees from the tonic", () => {
    const json = toJSON(
      parse("---\nkey: Em\nnumbering: 6m\n---\n## A\n6ø | 1\n@key G\n## B\n1Δ\n"),
    );
    expect(json.numbering).toBe("6m");
    expect(json.sections.map((section) => section.rows[0]?.minor)).toEqual([true, false]);
    const [first, second] = json.sections[0]!.rows[0]!.bars.map((bar) => bar.items[0]);
    expect(first).toMatchObject({ root: "6", degree: 0, quality: "m7b5" });
    expect(second).toMatchObject({ root: "1", degree: 3, quality: "" });
    expect(json.sections[1]!.rows[0]!.bars[0]!.items[0]).toMatchObject({
      quality: "maj7",
      degree: 0,
    });
  });
});

describe("R-00.16 the grammar of ChartDown 0.7 (spec 15)", () => {
  it("R-00.16 directive names are read in any case", () => {
    const chart = parse("## A\n1\n@KEY D\n4\n@Tempo 90\n5");
    expect(chart.sections[0]!.rows.map((row) => keyName(row.key))).toEqual(["C", "D", "D"]);
    expect(chart.sections[0]!.rows[2]?.tempo).toBe(90);
    expect(chart.warnings).toEqual([]);
  });

  it("R-00.16 a key change the parser cannot read is a warning on its line, and the key stays", () => {
    const chart = parse("## A\n1\n@key H\n4\n@key bm\n5");
    expect(chart.warnings.map(({ line, code }) => ({ line, code }))).toEqual([
      { line: 3, code: "bad-key-directive" },
      { line: 5, code: "bad-key-directive" },
    ]);
    expect(chart.sections[0]!.rows.map((row) => keyName(row.key))).toEqual(["C", "C", "C"]);
  });
});
