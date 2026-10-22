import { describe, expect, it } from "vitest";
import { tempoLabel } from "./tempo";

const words = (unit: string) =>
  ({ "q.": "dotted quarter", q: "quarter", "?": "unit to confirm" })[unit] ?? unit;

describe("T-2825 the tempo as people read it", () => {
  it("R-11.5 a written unit is said in words; without one the number stands alone", () => {
    expect(tempoLabel("58 q.", words)).toBe("58, dotted quarter");
    expect(tempoLabel("87q", words)).toBe("87, quarter");
    expect(tempoLabel("74.5", words)).toBe("74.5");
  });

  it("R-11.16 a tempo with ? says its unit is still to confirm", () => {
    expect(tempoLabel("58 ?", words)).toBe("58, unit to confirm");
  });
});
