import { parse } from "chartdown";
import { describe, expect, it } from "vitest";
import { effectiveLineup, setSongKey } from "./lineup";

const members = [
  { id: "ben", defaults: ["keys"] },
  { id: "cleo", defaults: ["bass"] },
];

describe("R-05.3 a set's lineup", () => {
  it("R-05.3 without its own lineup, each member plays their default instruments", () => {
    expect(Object.fromEntries(effectiveLineup(members, []))).toEqual({
      ben: ["keys"],
      cleo: ["bass"],
    });
  });

  it("R-05.3 with its own lineup, a member without instruments sits out", () => {
    const lineup = [
      { member_id: "ben", instrument_id: "keys" },
      { member_id: "ben", instrument_id: "vocals" },
    ];
    expect(Object.fromEntries(effectiveLineup(members, lineup))).toEqual({
      ben: ["keys", "vocals"],
      cleo: [],
    });
  });
});

describe("R-05.4 a song's key in a set", () => {
  const major = parse("---\nkey: G\n---\n## Verse\n1 | 4\n");
  const minor = parse("---\nkey: Em\n---\n## Verse\n1 | 4\n");

  it("R-05.4 the set key, when it fits the song's mode", () => {
    expect(setSongKey(major, "A")).toEqual({ root: "A", minor: false });
    expect(setSongKey(minor, "F#m")).toEqual({ root: "F#", minor: true });
  });

  it("R-05.4 as written, without a set key or with one of another mode", () => {
    expect(setSongKey(major, null)).toEqual({ root: "G", minor: false });
    expect(setSongKey(major, "Am")).toEqual({ root: "G", minor: false });
  });
});
