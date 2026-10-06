import { describe, expect, it } from "vitest";
import { readInstrument, readSlug } from "./instruments";

describe("T-1101 the instrument catalog form", () => {
  it("R-07.3 a slug is written as charts write it", () => {
    expect(readSlug(" Cello ")).toBe("cello");
    expect(readSlug("steel-guitar")).toBe("steel-guitar");
    expect(readSlug("steel guitar")).toBeNull();
    expect(readSlug("")).toBeNull();
  });

  it("R-07.3 names are required in both languages; aliases are a comma-separated list", () => {
    expect(
      readInstrument({ name_en: " Cello ", name_es: "Violonchelo", aliases: "VC, cello, vc" }),
    ).toEqual({
      fields: { name_en: "Cello", name_es: "Violonchelo", aliases: ["vc", "cello"] },
    });
    expect(readInstrument({ name_en: "Cello", name_es: " ", aliases: "" })).toEqual({
      problem: "name",
    });
    expect(readInstrument({ name_en: "Cello", name_es: "Chelo", aliases: "bass guitar" })).toEqual({
      problem: "alias",
    });
    expect(readInstrument({ name_en: "Cello", name_es: "Chelo", aliases: "" })).toEqual({
      fields: { name_en: "Cello", name_es: "Chelo", aliases: [] },
    });
  });
});
