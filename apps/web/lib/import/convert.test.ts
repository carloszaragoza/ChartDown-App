import { parse } from "chartdown";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { degree, readChord, readKey, writeChord } from "./chords";
import { importSheet, type ImportOptions } from "./convert";

const sheet = (name: string) =>
  readFileSync(new URL(`../../../../fixtures/import/${name}.txt`, import.meta.url), "utf8");
const numbers: ImportOptions = { style: "numbers", landmarkWords: 4 };
const rows = (source: string, section: string) => {
  const lines = source.split("\n");
  const start = lines.indexOf(`## ${section}`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end).filter(Boolean);
};

describe("T-1401 the import's test sheets", () => {
  it("SPEC-10 every test sheet is an original song that imports into a chart with no warnings", () => {
    for (const name of ["morning-light", "lantern-bay-minor", "harbor-lights-bars"]) {
      const result = importSheet(sheet(name), numbers);
      expect(parse(result.source).warnings, name).toEqual([]);
      expect(result.sections, name).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("T-1403 details and sections", () => {
  it("R-10.2 reads the title, writers, key, tempo and meter, and never the license lines", () => {
    const result = importSheet(sheet("morning-light"), numbers);
    expect(result.title).toBe("Morning Light");
    expect(result.writers).toBe("Sam Rivera");
    expect(result.source).toMatch(
      /^---\ntitle: Morning Light\nkey: E\ntempo: 72\nmeter: 4\/4\n---/,
    );
    expect(result.source).not.toMatch(/copyright|ccli|rights/i);
    const harbor = importSheet(sheet("harbor-lights-bars"), numbers);
    expect(harbor.source).toContain("tempo: 92");
    expect(harbor.source).toContain("meter: 4/4");
  });

  it("R-10.3 finds the sections by their headings, in any case and in brackets", () => {
    const sections = (name: string) =>
      importSheet(sheet(name), numbers)
        .source.split("\n")
        .filter((line) => line.startsWith("## "));
    expect(sections("morning-light")).toEqual(["## Intro", "## Verse 1", "## Chorus", "## Bridge"]);
    expect(sections("lantern-bay-minor")).toEqual(["## Verse", "## Chorus"]);
    expect(sections("harbor-lights-bars")).toEqual([
      "## Intro",
      "## Verse 1",
      "## Pre-Chorus",
      "## Chorus",
      "## Instrumental",
      "## Outro",
    ]);
  });

  it("R-10.3 Spanish sheets name their sections in Spanish, and keep those names", () => {
    const result = importSheet(
      "Verso 1\nG        C\nUna línea\nPrecoro\nAm   D\nCORO\nC   G   D   G\nPuente\nEm  C\n",
      numbers,
    );
    expect(result.source.split("\n").filter((line) => line.startsWith("## "))).toEqual([
      "## Verso 1",
      "## Precoro",
      "## Coro",
      "## Puente",
    ]);
  });

  it("R-10.3 a repeat it cannot map is flagged for review, never dropped", () => {
    const result = importSheet(sheet("harbor-lights-bars"), numbers);
    expect(result.review).toContainEqual(
      expect.objectContaining({ kind: "unmapped", section: "Chorus", detail: "x2" }),
    );
  });

  it("R-10.2 a sheet with no key gets one guessed from its first chord, and says so", () => {
    const result = importSheet("Verse\nAm   F   C   G\n", numbers);
    expect(result.key).toBe("Am");
    expect(result.review).toContainEqual({ kind: "key-guessed", detail: "Am" });
  });
});

describe("T-1404 chords", () => {
  it("R-10.4 reads slash chords, sus, extensions and chords outside the key", () => {
    expect(readChord("B/D#")).toEqual({ root: "B", quality: "", bass: "D#" });
    expect(readChord("Bsus4")).toEqual({ root: "B", quality: "sus4", bass: null });
    expect(readChord("F#m7")).toEqual({ root: "F#", quality: "m7", bass: null });
    expect(readChord("Cmaj7")?.quality).toBe("maj7");
    expect(readChord("CΔ7")?.quality).toBe("maj7");
    expect(readChord("Bø")?.quality).toBe("m7b5");
    expect(readChord("Bbmin")?.quality).toBe("m");
    expect(readChord("Morning")).toBeNull();
    expect(readChord("Every")).toBeNull();
    const result = importSheet(sheet("morning-light"), numbers);
    expect(rows(result.source, "Verse 1").at(-1)).toBe("6m | 4 | 5sus4 | 5");
  });

  it("R-10.4 a chord-only line with bar lines keeps its bars exactly", () => {
    const result = importSheet(sheet("harbor-lights-bars"), numbers);
    expect(rows(result.source, "Intro")).toEqual(["1 | 1 | 4 | 4"]);
    expect(rows(result.source, "Instrumental")).toEqual(["|: 1 5 | 6m 4 | 1 5 | 4 :| x2"]);
    expect(result.review.filter((item) => item.section === "Intro")).toEqual([]);
  });
});

describe("T-1405 numbers or letters", () => {
  it("R-10.5 in E minor, Em reads 1m, G b3, C b6 and D b7", () => {
    const key = readKey("Em");
    expect(key).toEqual({ tonic: "E", minor: true });
    expect(["E", "G", "C", "D"].map((note) => degree(note, key!))).toEqual(["1", "b3", "b6", "b7"]);
    const result = importSheet(sheet("lantern-bay-minor"), numbers);
    expect(rows(result.source, "Chorus")[1]).toBe("b7 | 1m");
  });

  it("R-10.5 slash basses become numbers too, and letters stay letters when asked", () => {
    const e = readKey("E")!;
    expect(writeChord(readChord("B/D#")!, e, "numbers")).toBe("5/7");
    expect(writeChord(readChord("B/D#")!, e, "letters")).toBe("B/D#");
    const letters = importSheet(sheet("morning-light"), { style: "letters", landmarkWords: 0 });
    expect(rows(letters.source, "Intro")).toEqual(["E | B/D# | C#m | A"]);
    expect(parse(letters.source).warnings).toEqual([]);
  });
});

describe("T-1406 proposed bars", () => {
  it("R-10.6 with no bar lines, each chord becomes a bar and every such row needs review", () => {
    const result = importSheet(sheet("morning-light"), numbers);
    expect(rows(result.source, "Intro")).toEqual(["1 | 5/7 | 6m | 4"]);
    const proposed = result.review.filter((item) => item.kind === "bars-proposed");
    const rowLines = result.source
      .split("\n")
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => line !== "" && !/^(---|##|[a-z]+:)/.test(line));
    expect(proposed.map((item) => item.line)).toEqual(rowLines.map(({ number }) => number));
  });
});

describe("T-1407 lyrics", () => {
  it("R-10.7 the lyrics are discarded; each section keeps its first words as a landmark", () => {
    const result = importSheet(sheet("morning-light"), numbers);
    expect(rows(result.source, "Verse 1")[0]).toBe('1 "Morning comes slow over" | 5/7');
    expect(result.source).not.toContain("Light on the water");
    expect(result.source).not.toContain("Never alone");
    for (const match of result.source.matchAll(/"([^"]*)"/g))
      expect(match[1]?.split(" ").length).toBeLessThanOrEqual(4);
  });

  it("R-10.7 a landmark is never longer than 8 words, and with landmarks off there is no lyric at all", () => {
    const long = importSheet(sheet("morning-light"), { style: "numbers", landmarkWords: 20 });
    for (const match of long.source.matchAll(/"([^"]*)"/g))
      expect(match[1]?.split(" ").length).toBeLessThanOrEqual(8);
    const none = importSheet(sheet("morning-light"), { style: "numbers", landmarkWords: 0 });
    expect(none.source).not.toContain('"');
    expect(none.source).not.toMatch(/Morning comes|Sing it out/);
  });
});
