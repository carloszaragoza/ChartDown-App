import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, lastShown, readPreferences } from "./preferences";

describe("T-2805 stand mode's View choices kept on the device", () => {
  it("R-03.12 saved choices come back, and anything unknown falls back to its default", () => {
    expect(readPreferences({ comingUp: "1", motion: "bounce", size: "lg" })).toEqual({
      comingUp: "1",
      motion: "bounce",
      size: "lg",
    });
    expect(readPreferences({ comingUp: "9", motion: 3 })).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it("R-03.12 Coming up shows one section, two, or every one after the current", () => {
    expect(lastShown(2, 9, "1")).toBe(3);
    expect(lastShown(2, 9, "2")).toBe(4);
    expect(lastShown(8, 9, "2")).toBe(9);
    expect(lastShown(2, 9, "fill")).toBe(9);
  });
});
