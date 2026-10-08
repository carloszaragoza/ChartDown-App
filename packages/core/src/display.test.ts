import { describe, expect, it } from "vitest";
import {
  chordFormatter,
  keyName,
  parseKeyName,
  semitonesBetween,
  transposeKey,
  type DisplayOptions,
} from "./display.js";
import { parse } from "./parse.js";
import type { Key } from "./types.js";

/** Every row of a chart as "chord chord | chord", in the given display. */
function rows(source: string, options: DisplayOptions): string[] {
  const chart = parse(source);
  const fmt = chordFormatter(chart, options);
  return chart.sections.flatMap((section) =>
    section.rows.map((row) =>
      row.bars
        .map((bar) =>
          bar.items
            .map((item) =>
              item.type === "chord"
                ? fmt.chord(item, row).text
                : item.type === "riff"
                  ? `R[ ${item.notes.map((note) => (note.type === "rest" ? "x" : fmt.root(note.root, row))).join(" ")} ]`
                  : { "no-chord": "x", "repeat-bar": "%", tie: "=" }[item.type],
            )
            .join(" "),
        )
        .join(" | "),
    ),
  );
}

const key = (name: string) => parseKeyName(name) as Key;

describe("T-103 evidence", () => {
  it("transposing G to A gives the right chords", () => {
    expect(
      rows("---\nkey: G\n---\n## A\n1 | 4 | 5 | 6m", { style: "letters", key: key("A") }),
    ).toEqual(["A | D | E | F#m"]);
  });

  it("Em with b3 gives the right chords", () => {
    expect(rows("---\nkey: Em\n---\n## A\n1m | b3 | b6 | b7", { style: "letters" })).toEqual([
      "Em | G | C | D",
    ]);
  });
});

describe("chordFormatter", () => {
  it("shows letters as numbers relative to the row's key", () => {
    expect(rows("---\nkey: G\n---\n## A\nG | C | D/F# | Em7 | F", { style: "numbers" })).toEqual([
      "1 | 4 | 5/7 | 6-7 | b7",
    ]);
  });

  it("shows every minor quality with - in number style, but not maj", () => {
    expect(rows("## A\n6m | 2m7 | 1maj7 | 7m7b5 | 4", { style: "numbers" })).toEqual([
      "6- | 2-7 | 1maj7 | 7-7b5 | 4",
    ]);
  });

  it("uses flats in F, Bb, Eb, Ab, Db and Gb and sharps otherwise", () => {
    expect(rows("---\nkey: Bb\n---\n## A\n1 | 3 | #4 | b7", { style: "letters" })).toEqual([
      "Bb | D | E | Ab",
    ]);
    expect(rows("---\nkey: E\n---\n## A\n1 | 3 | #4 | b7", { style: "letters" })).toEqual([
      "E | G# | A# | D",
    ]);
  });

  it("spells minor keys like their relative major", () => {
    expect(rows("---\nkey: Dm\n---\n## A\n1m | b6 | b7 | b3", { style: "letters" })).toEqual([
      "Dm | Bb | C | F",
    ]);
    // Spec 12.4's flat names never include Cb or Fb, so the b6 of Ebm reads B, as in Gb major.
    expect(rows("---\nkey: Ebm\n---\n## A\n1m | b6 | b7", { style: "letters" })).toEqual([
      "Ebm | B | Db",
    ]);
    expect(rows("---\nkey: Bm\n---\n## A\n1m | b6 | 5", { style: "letters" })).toEqual([
      "Bm | G | F#",
    ]);
  });

  it("keeps letters as written when the chart is not transposed", () => {
    expect(rows("---\nkey: F\n---\n## A\nA# | Bb", { style: "letters" })).toEqual(["A# | Bb"]);
  });

  it("respells letters when the chart is transposed", () => {
    expect(
      rows("---\nkey: G\n---\n## A\nG | C | D/F#", { style: "letters", key: key("F") }),
    ).toEqual(["F | Bb | C/E"]);
  });

  it("moves key changes by the same interval", () => {
    const source = "---\nkey: G\n---\n## Chorus\n1 | 4\n@key A\n1 | 4";
    expect(rows(source, { style: "letters", key: key("A") })).toEqual(["A | D", "B | E"]);
    const chart = parse(source);
    const fmt = chordFormatter(chart, { style: "letters", key: key("A") });
    expect(chart.sections[0]?.rows.map((row) => keyName(fmt.rowKey(row)))).toEqual(["A", "B"]);
  });

  it("keeps the key name the musician picked for the home key", () => {
    const fmt = chordFormatter(parse("---\nkey: G\n---\n## A\n1"), {
      style: "letters",
      key: key("C#"),
    });
    expect(fmt.homeKey).toEqual({ root: "C#", minor: false });
  });

  it("keeps the chart's mode when transposing", () => {
    const fmt = chordFormatter(parse("---\nkey: Em\n---\n## A\n1m"), {
      style: "letters",
      key: key("F#"),
    });
    expect(fmt.homeKey).toEqual({ root: "F#", minor: true });
  });

  it("leaves numbers unchanged in number style, whatever the display key", () => {
    expect(
      rows("---\nkey: G\n---\n## A\n1 | b7 | #4", { style: "numbers", key: key("A") }),
    ).toEqual(["1 | b7 | #4"]);
  });

  it("leaves no chord, repeat bar and tie as they are", () => {
    expect(rows("## A\nx | % | =", { style: "letters", key: key("D") })).toEqual(["x | % | ="]);
  });

  it("does not change the chart", () => {
    const chart = parse("---\nkey: G\n---\n## A\n1 | 4 | 6m");
    const before = JSON.stringify(chart);
    const fmt = chordFormatter(chart, { style: "letters", key: key("A") });
    for (const row of chart.sections[0]?.rows ?? [])
      for (const bar of row.bars)
        for (const item of bar.items) if (item.type === "chord") fmt.chord(item, row);
    expect(JSON.stringify(chart)).toBe(before);
  });

  it.each(["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"])(
    "letters in %s read back as the same numbers",
    (name) => {
      const numbers = "1 | 2m | 3m | 4 | 5 | 6m | 7dim | b7 | b3 | #4";
      const letters = rows(`---\nkey: G\n---\n## A\n${numbers}`, {
        style: "letters",
        key: key(name),
      })[0];
      expect(rows(`---\nkey: ${name}\n---\n## A\n${letters}`, { style: "numbers" })).toEqual([
        "1 | 2- | 3- | 4 | 5 | 6- | 7dim | b7 | b3 | #4",
      ]);
    },
  );
});

describe("keys", () => {
  it("names keys and reads key names", () => {
    expect(keyName({ root: "F#", minor: true })).toBe("F#m");
    expect(parseKeyName("Bbm")).toEqual({ root: "Bb", minor: true });
    expect(parseKeyName("H")).toBeUndefined();
  });

  it("measures semitones upward between keys", () => {
    expect(semitonesBetween(key("G"), key("A"))).toBe(2);
    expect(semitonesBetween(key("A"), key("G"))).toBe(10);
    expect(semitonesBetween(key("F#"), key("Gb"))).toBe(0);
  });

  it("gives transposed keys their common names", () => {
    expect(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => transposeKey(key("C"), n).root),
    ).toEqual(["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]);
    expect(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => keyName(transposeKey(key("Cm"), n))),
    ).toEqual(["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"]);
    expect(transposeKey(key("G"), -2)).toEqual({ root: "F", minor: false });
  });
});
