import { describe, expect, it } from "vitest";
import { createRoleResolver, STANDARD_INSTRUMENTS } from "./roles.js";
import { parseRow, type RowContext } from "./row.js";
import type { WarningCode } from "./types.js";

function row(text: string, beatsPerBar = 4) {
  const warnings: WarningCode[] = [];
  const ctx: RowContext = {
    line: 1,
    beatsPerBar,
    roles: createRoleResolver(STANDARD_INSTRUMENTS, ["cello"]),
    warn: (_line, code) => warnings.push(code),
  };
  return { bars: parseRow(text, ctx), warnings };
}

describe("parseRow", () => {
  it("splits bars on | with optional outer bars", () => {
    expect(row("1 | 4 | 5").bars).toHaveLength(3);
    expect(row("| 1 | 4 |").bars).toHaveLength(2);
    expect(row("|").bars).toBeUndefined();
  });

  it("reads repeats and how many times they play", () => {
    const { bars } = row("|: 1 | 4 :| x3");
    expect(bars?.[0]?.repeatStart).toBe(true);
    expect(bars?.[1]?.repeatEnd).toEqual({ times: 3 });
    expect(row("1 :|").bars?.[0]?.repeatEnd).toEqual({ times: 2 });
  });

  it("reads endings, including lists and ranges", () => {
    expect(row("[1] 5").bars?.[0]?.ending).toEqual([1]);
    expect(row("[1,2] 5").bars?.[0]?.ending).toEqual([1, 2]);
    expect(row("[2-4] 5").bars?.[0]?.ending).toEqual([2, 3, 4]);
  });

  it("reads dynamics, cues for everyone and cues per instrument", () => {
    const [bar] = row("{p} 1 {drums: in} {watch me} {cello: swell}").bars ?? [];
    expect(bar?.dynamic).toBe("p");
    expect(bar?.cues).toEqual([
      { roles: ["drums"], text: "in" },
      { roles: ["everyone"], text: "watch me" },
      { roles: ["cello"], text: "swell" },
    ]);
  });

  it("keeps a cue with an unknown name whole, for everyone, with a warning", () => {
    const { bars, warnings } = row("1 {intro: soft}");
    expect(bars?.[0]?.cues).toEqual([{ roles: ["everyone"], text: "intro: soft" }]);
    expect(warnings).toEqual(["unknown-cue-instrument"]);
  });

  it("reads lyric landmarks and warns above 8 words", () => {
    expect(row('1 "Take the open road"').bars?.[0]?.lyric).toBe("Take the open road");
    expect(row('1 "a b" 4 "c"').bars?.[0]?.lyric).toBe("a b / c");
    expect(row('1 "one two three four five six seven eight"').warnings).toEqual([]);
    expect(row('1 "one two three four five six seven eight nine"').warnings).toEqual([
      "landmark-too-long",
    ]);
  });

  it("warns when explicit beats do not fill the meter", () => {
    expect(row("1:3 4:1").warnings).toEqual([]);
    expect(row("1:2.5 4:1.5").warnings).toEqual([]);
    expect(row("1:2 4:2", 3).warnings).toEqual(["beats-mismatch"]);
    expect(row("1 4").warnings).toEqual([]);
  });

  it("warns about unreadable tokens and bars with no chords, and keeps the rest", () => {
    const { bars, warnings } = row("1 ? 4 | {p}");
    expect(bars?.[0]?.items).toHaveLength(2);
    expect(warnings).toEqual(["bad-token", "empty-bar"]);
  });
});
