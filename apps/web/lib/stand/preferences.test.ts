import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, readPreferences, upcomingSections } from "./preferences";

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
    expect(upcomingSections(2, 9, null, "1")).toEqual([3]);
    expect(upcomingSections(2, 9, null, "2")).toEqual([3, 4]);
    expect(upcomingSections(8, 9, null, "2")).toEqual([9]);
    expect(upcomingSections(2, 5, null, "fill")).toEqual([3, 4, 5]);
    expect(upcomingSections(5, 5, null, "fill")).toEqual([]);
  });

  it("R-11.15 a queued section comes right after the current one, then what plays after it", () => {
    // In the Chorus (2), the band is told to go to Verse 1 (1): the Verse, then what follows it.
    expect(upcomingSections(2, 5, 1, "fill")).toEqual([1, 2, 3, 4, 5]);
    // Further on, skipping what is in between.
    expect(upcomingSections(2, 6, 5, "fill")).toEqual([5, 6]);
    expect(upcomingSections(2, 6, 5, "1")).toEqual([5]);
    // The same section again.
    expect(upcomingSections(2, 3, 2, "2")).toEqual([2, 3]);
  });
});
