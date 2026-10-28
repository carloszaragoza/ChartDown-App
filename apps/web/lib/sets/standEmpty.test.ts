import { describe, expect, it } from "vitest";
import { createSetHref, type StandBand } from "./standEmpty";

const personal: StandBand = { id: "p", name: "Personal", personal: true, role: "md" };
const directed: StandBand = { id: "d", name: "Lantern Bay", personal: false, role: "md" };
const played: StandBand = { id: "m", name: "Harbor Lights", personal: false, role: "musician" };

describe("T-2847 Stand mode with no set to open", () => {
  it("R-05.7 Create a set leads to the band they direct, otherwise their personal space", () => {
    expect(createSetHref([personal, directed], undefined)).toBe("/bands/d/sets");
    expect(createSetHref([personal, played, directed], "m")).toBe("/bands/p/sets");
    expect(createSetHref([personal, played], undefined)).toBe("/bands/p/sets");
  });

  it("R-05.7 a person in no band yet only sees all sets", () => {
    expect(createSetHref([personal], undefined)).toBeNull();
    expect(createSetHref([], undefined)).toBeNull();
  });
});
