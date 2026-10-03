import { describe, expect, it } from "vitest";
import { parseToken } from "./chord.js";

const chord = (fields: object) => ({
  type: "chord",
  quality: "",
  beats: 1,
  explicitBeats: false,
  push: false,
  hold: false,
  stab: false,
  fermata: false,
  ...fields,
});

describe("parseToken", () => {
  it("reads number and letter roots with qualities and slash basses", () => {
    expect(parseToken("1")).toEqual(chord({ root: "1" }));
    expect(parseToken("b7")).toEqual(chord({ root: "b7" }));
    expect(parseToken("6m")).toEqual(chord({ root: "6", quality: "m" }));
    expect(parseToken("4add9")).toEqual(chord({ root: "4", quality: "add9" }));
    expect(parseToken("Bb/D")).toEqual(chord({ root: "Bb", bass: "D" }));
    expect(parseToken("1/3")).toEqual(chord({ root: "1", bass: "3" }));
  });

  it("normalizes a leading - to m", () => {
    expect(parseToken("6-")).toEqual(chord({ root: "6", quality: "m" }));
    expect(parseToken("2-7")).toEqual(chord({ root: "2", quality: "m7" }));
  });

  it("reads beats, push, hold, stab and fermata", () => {
    expect(parseToken("1:3")).toEqual(chord({ root: "1", beats: 3, explicitBeats: true }));
    expect(parseToken("4:1.5")).toEqual(chord({ root: "4", beats: 1.5, explicitBeats: true }));
    expect(parseToken("'4:2!")).toEqual(
      chord({ root: "4", beats: 2, explicitBeats: true, push: true, stab: true }),
    );
    expect(parseToken("<1>~")).toEqual(chord({ root: "1", hold: true, fermata: true }));
  });

  it("reads no chord, repeat bar and tie", () => {
    expect(parseToken("x")).toEqual({ type: "no-chord" });
    expect(parseToken("X")).toEqual({ type: "no-chord" });
    expect(parseToken("%")).toEqual({ type: "repeat-bar" });
    expect(parseToken("=")).toEqual({ type: "tie" });
  });

  it("returns undefined for tokens it cannot read", () => {
    for (const token of ["8", "H", "?", "<>", "<4>~:1", "1/9"])
      expect(parseToken(token)).toBeUndefined();
  });
});
