import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";
import { STANDARD_INSTRUMENTS } from "./roles.js";
import type { Instrument } from "./types.js";

// A catalog as the Admin might keep it: its own ids, renamed and extra instruments.
const catalog: Instrument[] = [
  { id: "drums", names: ["drums", "kit"] },
  { id: "bass", names: ["bass"] },
  { id: "cajon", names: ["cajon"] },
  { id: "keys", names: ["keys", "piano"] },
];

const song = (body: string, header = "") => `---\n${header}---\n## Chorus\n${body}`;

describe("R-00.1 instruments come from the Admin's catalog", () => {
  it("R-00.1 instruments come from the injected catalog, not a fixed list", () => {
    const chart = parse(song("> MD cajon, kit: Together.\n> MD gtr: Clean.\n1 {piano: out}"), {
      instruments: catalog,
    });
    const [cajon, guitar] = chart.sections[0]?.notes ?? [];
    expect(cajon?.roles).toEqual(["cajon", "drums"]);
    expect(guitar?.roles).toEqual(["everyone"]);
    expect(chart.sections[0]?.rows[0]?.bars[0]?.cues).toEqual([{ roles: ["keys"], text: "out" }]);
    expect(chart.warnings.map((w) => [w.code, w.values?.name])).toEqual([
      ["unknown-instrument", "gtr"],
    ]);
  });

  it("R-00.1 an unknown instrument warns and is shown to everyone", () => {
    const chart = parse(song("> MD kazoo: Loud.\n1 {kazoo: in} | 4"), { instruments: catalog });
    const section = chart.sections[0];
    expect(section?.notes[0]).toMatchObject({ md: true, roles: ["everyone"], text: "Loud." });
    expect(section?.rows[0]?.bars[0]?.cues).toEqual([{ roles: ["everyone"], text: "kazoo: in" }]);
    expect(chart.warnings).toEqual([
      {
        line: 4,
        code: "unknown-instrument",
        message: "Unknown instrument “kazoo” in an MD note",
        values: { name: "kazoo" },
      },
      {
        line: 5,
        code: "unknown-cue-instrument",
        message: "Unknown instrument “kazoo” in a cue",
        values: { name: "kazoo" },
      },
    ]);
  });

  it("R-00.1 instruments declared in the header are added to the catalog", () => {
    const chart = parse(song("> MD cello & cajon: Swell.\n1", "instruments: cello\n"), {
      instruments: catalog,
    });
    expect(chart.sections[0]?.notes[0]?.roles).toEqual(["cello", "cajon"]);
    expect(chart.warnings).toEqual([]);
  });

  it("R-00.1 without a catalog the parser uses the spec's standard roles", () => {
    const chart = parse(song("> MD gtr, sax, vln: Out.\n1"));
    expect(chart.sections[0]?.notes[0]?.roles).toEqual(["guitar", "saxophone", "violin"]);
    expect(STANDARD_INSTRUMENTS.map((i) => i.id)).toEqual([
      "drums",
      "bass",
      "keys",
      "guitar",
      "vocals",
      "saxophone",
      "trumpet",
      "trombone",
      "violin",
    ]);
  });

  it("R-00.1 the same chart reads differently only through the catalog it is given", () => {
    const source = song("> MD cajon: In.\n1");
    expect(parse(source).warnings.map((w) => w.code)).toEqual(["unknown-instrument"]);
    expect(parse(source, { instruments: catalog }).warnings).toEqual([]);
    expect(parse(source).warnings.map((w) => w.code)).toEqual(["unknown-instrument"]);
  });
});
