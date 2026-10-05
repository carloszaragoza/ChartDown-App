import { describe, expect, it } from "vitest";
import { readInvite } from "./invites";

describe("T-1102 the invite code form", () => {
  it("R-01.7 a single-use code is used once, whatever the form says", () => {
    expect(readInvite({ kind: "single_use", max_uses: "50", note: " For Luis " })).toEqual({
      fields: { kind: "single_use", max_uses: 1, note: "For Luis" },
    });
  });

  it("R-01.7 a band code has a number of uses, or no limit when left empty", () => {
    expect(readInvite({ kind: "band", max_uses: "10", note: "" })).toEqual({
      fields: { kind: "band", max_uses: 10, note: null },
    });
    expect(readInvite({ kind: "band", max_uses: "", note: "Cedar Band" })).toEqual({
      fields: { kind: "band", max_uses: null, note: "Cedar Band" },
    });
    expect(readInvite({ kind: "band", max_uses: "0", note: "" })).toEqual({ problem: "uses" });
    expect(readInvite({ kind: "band", max_uses: "2.5", note: "" })).toEqual({ problem: "uses" });
    expect(readInvite({ kind: "band", max_uses: "3", note: "x".repeat(201) })).toEqual({
      problem: "note",
    });
  });
});
