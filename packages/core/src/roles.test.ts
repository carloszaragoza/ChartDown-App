import { describe, expect, it } from "vitest";
import { createRoleResolver, parseInstrumentsHeader } from "./roles.js";

describe("createRoleResolver", () => {
  const roles = createRoleResolver(["cello", "banjo"]);

  it("maps every accepted name to its standard role", () => {
    expect(roles("all band everyone")).toEqual(["everyone"]);
    expect(roles("drum perc")).toEqual(["drums"]);
    expect(roles("piano pad synth")).toEqual(["keys"]);
    expect(roles("gtr eg ag")).toEqual(["guitar"]);
    expect(roles("vox lead bgv bgvs")).toEqual(["vocals"]);
    expect(roles("sax, tpt, tbn, vln")).toEqual(["saxophone", "trumpet", "trombone", "violin"]);
  });

  it("accepts commas, slashes, ampersands and spaces, in any case", () => {
    expect(roles("Bass, KEYS/drums & gtr")).toEqual(["bass", "keys", "drums", "guitar"]);
  });

  it("accepts declared custom instruments", () => {
    expect(roles("cello & banjo")).toEqual(["cello", "banjo"]);
  });

  it("returns undefined when any name is unknown", () => {
    expect(roles("bass kazoo")).toBeUndefined();
    expect(roles("constructor")).toBeUndefined();
    expect(roles("")).toBeUndefined();
  });
});

describe("parseInstrumentsHeader", () => {
  it("lowercases ids, drops duplicates and warns about invalid ids on the header line", () => {
    const warnings: [number, string][] = [];
    const ids = parseInstrumentsHeader("Cello, banjo, cello, Bad_Id, ", 6, (line, code) =>
      warnings.push([line, code]),
    );
    expect(ids).toEqual(["cello", "banjo"]);
    expect(warnings).toEqual([[6, "instrument-id"]]);
  });
});
