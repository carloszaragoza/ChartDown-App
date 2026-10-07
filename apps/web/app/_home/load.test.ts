import { describe, expect, it } from "vitest";
import { homeVariant } from "./load";

describe("T-1308 which Home a person gets", () => {
  it("T-1308 a person with no band and no version is new", () => {
    expect(homeVariant({ bands: 0, versions: 0, directsCurrentBand: false })).toBe("new");
  });
  it("T-1308 the music director of the current band gets the director's Home", () => {
    expect(homeVariant({ bands: 2, versions: 0, directsCurrentBand: true })).toBe("md");
  });
  it("T-1308 anyone else, a version or a band in hand, gets the musician's Home", () => {
    expect(homeVariant({ bands: 1, versions: 0, directsCurrentBand: false })).toBe("musician");
    expect(homeVariant({ bands: 0, versions: 3, directsCurrentBand: false })).toBe("musician");
  });
});
