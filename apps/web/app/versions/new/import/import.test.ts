import { describe, expect, it } from "vitest";
import { MAX_LINES, readPaste } from "../../../../lib/import/paste";
import { groupReview } from "../../../../lib/import/review";

describe("T-1409 importing a pasted chord sheet", () => {
  it("R-10.13 a paste must hold something, and at most 300 lines", () => {
    expect(readPaste("   \n ")).toBe("empty");
    expect(readPaste("Verse\nG C\n")).toBe("ok");
    expect(readPaste(Array.from({ length: MAX_LINES + 1 }, () => "G").join("\n"))).toBe("too_long");
  });

  it("R-10.8 the review panel groups every assumption with the lines it is about", () => {
    expect(
      groupReview([
        { kind: "bars-proposed", line: 8, section: "Intro" },
        { kind: "bars-proposed", line: 10, section: "Verse" },
        { kind: "unmapped", line: 15, section: "Chorus", detail: "x2" },
        { kind: "key-guessed", detail: "Am" },
      ]),
    ).toEqual([
      { kind: "bars-proposed", lines: [8, 10], details: [] },
      { kind: "unmapped", lines: [15], details: ["x2"] },
      { kind: "key-guessed", lines: [], details: ["Am"] },
    ]);
  });
});
