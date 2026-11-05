import { describe, expect, it } from "vitest";
import { leadingStart } from "./MetronomeControls";

describe("the MD's Play in live (T-3052)", () => {
  it("R-14.2 leading, Play starts at once: no moment ahead and no count-in", () => {
    expect(leadingStart(600)).toEqual({ countIn: false });
    expect(leadingStart(600)).not.toHaveProperty("startAt");
  });
  it("R-14.2 alone, Play keeps the person's own count-in", () => {
    expect(leadingStart(null)).toEqual({});
  });
});
