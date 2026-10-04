import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";

// Constitution 6: no full lyrics, only short landmarks of 8 words at most.
const chart = (bar: string) => parse(`## Verse\n${bar} | 4`);
const lyric = (bar: string) => chart(bar).sections[0]?.rows[0]?.bars[0]?.lyric;
const codes = (bar: string) => chart(bar).warnings.map((w) => w.code);

describe("Constitution 6 lyric landmarks are 8 words at most", () => {
  it("a 9-word landmark produces a warning", () => {
    expect(chart('1 "one two three four five six seven eight nine"').warnings).toEqual([
      {
        line: 2,
        code: "landmark-too-long",
        message: "This lyric landmark has 9 words; keep it to 8 or fewer",
        values: { words: 9, max: 8 },
      },
    ]);
  });

  it("landmarks of 1 to 8 words do not warn", () => {
    expect(codes('1 "Home"')).toEqual([]);
    expect(codes('1 "one two three four five six seven eight"')).toEqual([]);
  });

  it("a word is anything between spaces", () => {
    expect(codes("1 \"a well-known road, rock 'n' roll all night\"")).toEqual([]); // 8 words
    expect(codes('1 "  extra   spaces    do not   add words  "')).toEqual([]);
    expect(codes('1 "la canción del camino abierto bajo el cielo"')).toEqual([]); // 8 words
    expect(
      chart('1 "la canción del camino abierto bajo el cielo azul"').warnings[0]?.values,
    ).toEqual({
      words: 9,
      max: 8,
    });
  });

  it("checks each landmark in a bar on its own", () => {
    const bar = '1 "one two three four five" 4 "six seven eight nine ten"';
    expect(codes(bar)).toEqual([]);
    expect(lyric(bar)).toBe("one two three four five / six seven eight nine ten");
  });

  it("warns for each long landmark, with its line, anywhere in a section", () => {
    const long = '"one two three four five six seven eight nine"';
    const warnings = parse(`## Verse\n1 | 4\n5 ${long} | 1 ${long}`).warnings;
    expect(warnings.map((w) => [w.line, w.code])).toEqual([
      [3, "landmark-too-long"],
      [3, "landmark-too-long"],
    ]);
  });

  it("keeps a long landmark so the author can see what to shorten", () => {
    expect(lyric('1 "one two three four five six seven eight nine"')).toBe(
      "one two three four five six seven eight nine",
    );
  });
});
