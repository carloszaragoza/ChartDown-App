import { describe, expect, it } from "vitest";
import { checkedPoints } from "./points";

describe("T-2830 where the music starts and ends", () => {
  it("R-03.11 the end is optional, and after the start", () => {
    expect(checkedPoints({ startMs: 2000.4, endMs: null })).toEqual({ startMs: 2000, endMs: null });
    expect(checkedPoints({ startMs: 2000, endMs: 245000 })).toEqual({
      startMs: 2000,
      endMs: 245000,
    });
    expect(checkedPoints({ startMs: 2000, endMs: 2000 })).toBeNull();
  });

  it("R-06.7 both stay within an hour", () => {
    expect(checkedPoints({ startMs: -1, endMs: null })).toBeNull();
    expect(checkedPoints({ startMs: 0, endMs: 3_600_001 })).toBeNull();
  });
});
