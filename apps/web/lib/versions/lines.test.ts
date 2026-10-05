import { describe, expect, it } from "vitest";
import { lineRange, normalizeLineBreaks } from "./lines";

describe("lineRange", () => {
  const text = "## Verse\n1 | 4\n\n5 | ???";

  it("R-03.1 a warning's line maps to the text the cursor moves to", () => {
    expect(lineRange(text, 1)).toEqual({ start: 0, end: 8 });
    expect(lineRange(text, 2)).toEqual({ start: 9, end: 14 });
    expect(lineRange(text, 3)).toEqual({ start: 15, end: 15 });
    expect(text.slice(lineRange(text, 4).start, lineRange(text, 4).end)).toBe("5 | ???");
  });

  it("R-03.1 a line past the end goes to the end", () => {
    expect(lineRange(text, 9)).toEqual({ start: text.length, end: text.length });
  });
});

describe("normalizeLineBreaks", () => {
  it("R-03.1 a chart sent by a form is saved with the line breaks the editor holds", () => {
    expect(normalizeLineBreaks("## Verse\r\n1 | 4\r\n\r5")).toBe("## Verse\n1 | 4\n\n5");
  });
});
