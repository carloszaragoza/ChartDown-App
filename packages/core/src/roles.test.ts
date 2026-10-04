import { describe, expect, it } from "vitest";
import { createRoleResolver, parseInstrumentsHeader, STANDARD_INSTRUMENTS } from "./roles.js";

describe("createRoleResolver", () => {
  const roles = createRoleResolver(STANDARD_INSTRUMENTS, ["cello", "banjo"]);

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

describe("createRoleResolver with a catalog", () => {
  const catalog = [
    { id: "cajon", names: ["cajon", "box"] },
    { id: "keys", names: ["keys", "piano"] },
  ];
  const roles = createRoleResolver(catalog, ["cello"]);

  it("resolves the catalog's ids and names to the catalog id", () => {
    expect(roles("box & Piano")).toEqual(["cajon", "keys"]);
  });

  it("does not know standard roles the catalog leaves out", () => {
    expect(roles("drums")).toBeUndefined();
  });

  it("always knows the names for everyone, and the catalog cannot redefine them", () => {
    expect(createRoleResolver([{ id: "band-leader", names: ["band"] }], [])("band")).toEqual([
      "everyone",
    ]);
  });

  it("adds custom ids from the header, but the catalog's meaning of a name wins", () => {
    expect(roles("cello")).toEqual(["cello"]);
    expect(createRoleResolver(catalog, ["box"])("box")).toEqual(["cajon"]);
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
