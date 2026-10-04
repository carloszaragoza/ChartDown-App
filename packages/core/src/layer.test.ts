import { describe, expect, it } from "vitest";
import { formatLayer, parseLayer, placeLayer } from "./layer.js";
import { parse } from "./parse.js";
import type { Layer, LayerNote } from "./types.js";

// An original song: two choruses, a bridge with three bars.
const CHART = `---
key: G
---
## Verse
1 | 4 | 1 | 5
## Chorus
4 | 1 | 5 | 6m
## Bridge
6m | 4 | 1
## Chorus
4 | 1 | 5 | 1
`;

const LAYER = `---
chartdown: 0.5
layer: Open Road
---
## Chorus
> MD: Bigger than the record.
> MD bass: Walk up in the last bar.

## Chorus
> MD drums: Crash on 1.

## Bridge
### Bar 3
> MD keys: Pad swell.
`;

const note = (fields: Partial<LayerNote>): LayerNote => ({
  section: "Chorus",
  occurrence: 1,
  roles: ["everyone"],
  text: "Note.",
  ...fields,
});

describe("R-00.2 MD layer notes are anchored to a section and, when needed, a bar", () => {
  it("R-00.2 reads the text form into notes anchored by section name, occurrence and bar", () => {
    const { layer, warnings, version } = parseLayer(LAYER);
    expect(version).toBe("0.5");
    expect(warnings).toEqual([]);
    expect(layer).toEqual({
      title: "Open Road",
      notes: [
        { section: "Chorus", occurrence: 1, roles: ["everyone"], text: "Bigger than the record." },
        { section: "Chorus", occurrence: 1, roles: ["bass"], text: "Walk up in the last bar." },
        { section: "Chorus", occurrence: 2, roles: ["drums"], text: "Crash on 1." },
        { section: "Bridge", occurrence: 1, bar: 3, roles: ["keys"], text: "Pad swell." },
      ],
    });
  });

  it("R-00.2 places each note on its section occurrence and bar", () => {
    const placement = placeLayer(parse(CHART), parseLayer(LAYER).layer);
    expect(placement.unplaced).toEqual([]);
    expect(
      placement.sections.map((notes) => notes.map((n) => [n.note.text, n.bar ?? null])),
    ).toEqual([
      [],
      [
        ["Bigger than the record.", null],
        ["Walk up in the last bar.", null],
      ],
      [["Pad swell.", 3]],
      [["Crash on 1.", null]],
    ]);
  });

  it("R-00.2 renaming a section flags its notes without losing them", () => {
    const layer = parseLayer(LAYER).layer;
    const before = JSON.stringify(layer);
    const renamed = parse(CHART.replace("## Bridge", "## Breakdown"));

    const placement = placeLayer(renamed, layer);
    expect(placement.unplaced).toEqual([{ note: layer.notes[3], reason: "section" }]);
    expect(placement.sections.flat().map((n) => n.note.text)).toEqual([
      "Bigger than the record.",
      "Walk up in the last bar.",
      "Crash on 1.",
    ]);
    expect(JSON.stringify(layer)).toBe(before);
  });

  it("R-00.2 occurrences count the sections with that name in the chart being placed on", () => {
    // Renaming the first of two choruses makes the second one occurrence 1.
    const layer = parseLayer(LAYER).layer;
    const placement = placeLayer(
      parse(CHART.replace("## Chorus\n4 | 1 | 5 | 6m", "## Hook\n4 | 1 | 5 | 6m")),
      layer,
    );
    expect(placement.sections[3]?.map((n) => n.note.text)).toEqual([
      "Bigger than the record.",
      "Walk up in the last bar.",
    ]);
    expect(placement.unplaced).toEqual([{ note: layer.notes[2], reason: "section" }]);
  });

  it("R-00.2 a deleted section or a removed second occurrence leaves its notes unplaced", () => {
    const layer: Layer = {
      notes: [
        note({ occurrence: 2, text: "Second chorus." }),
        note({ section: "Tag", text: "Tag." }),
      ],
    };
    const placement = placeLayer(parse("## Chorus\n1\n## Bridge\n4"), layer);
    expect(placement.unplaced.map((u) => [u.note.text, u.reason])).toEqual([
      ["Second chorus.", "section"],
      ["Tag.", "section"],
    ]);
  });

  it("R-00.2 a bar the section no longer has leaves the note unplaced, not moved to the section", () => {
    const layer: Layer = { notes: [note({ section: "Bridge", bar: 4, text: "Bar four." })] };
    const placement = placeLayer(parse(CHART), layer);
    expect(placement.sections.flat()).toEqual([]);
    expect(placement.unplaced).toEqual([{ note: layer.notes[0], reason: "bar" }]);
  });

  it("R-00.2 bars count across a section's rows", () => {
    const layer: Layer = { notes: [note({ section: "A", bar: 5, text: "Row two." })] };
    const placement = placeLayer(parse("## A\n1 | 4 | 5 | 1\n6m | 4"), layer);
    expect(placement.sections[0]).toEqual([{ note: layer.notes[0], bar: 5 }]);
  });

  it("R-00.2 section names match ignoring case and surrounding spaces, and nothing looser", () => {
    const layer: Layer = { notes: [note({ section: "  chorus " }), note({ section: "Chorus 1" })] };
    const placement = placeLayer(parse("## CHORUS\n1"), layer);
    expect(placement.sections[0]?.map((n) => n.note.section)).toEqual(["  chorus "]);
    expect(placement.unplaced.map((u) => u.note.section)).toEqual(["Chorus 1"]);
  });

  it("R-00.2 writing a layer and reading it back gives the same notes", () => {
    const { layer } = parseLayer(LAYER);
    expect(formatLayer(layer)).toBe(LAYER);
    expect(parseLayer(formatLayer(layer)).layer).toEqual(layer);
  });

  it("R-00.2 the writer adds empty headings to reach a later occurrence", () => {
    const layer: Layer = {
      notes: [note({ occurrence: 3, roles: ["bass", "keys"], text: "Out." })],
    };
    expect(formatLayer(layer)).toBe(
      "---\nchartdown: 0.5\n---\n## Chorus\n\n## Chorus\n\n## Chorus\n> MD bass, keys: Out.\n",
    );
    expect(parseLayer(formatLayer(layer)).layer).toEqual(layer);
  });

  it("R-00.2 the writer declares instruments outside the catalog so they read back", () => {
    const catalog = [{ id: "cajon", names: ["cajon"] }];
    const layer: Layer = { notes: [note({ roles: ["cajon", "cello"], text: "Soft." })] };
    const text = formatLayer(layer, { instruments: catalog });
    expect(text).toContain("instruments: cello\n");
    expect(parseLayer(text, { instruments: catalog })).toMatchObject({ layer, warnings: [] });
  });

  it("R-00.2 the writer refuses anchors it cannot write instead of changing them", () => {
    expect(() => formatLayer({ notes: [note({ occurrence: 0 })] })).toThrow(RangeError);
    expect(() => formatLayer({ notes: [note({ bar: 1.5 })] })).toThrow(RangeError);
  });

  it("R-00.2 reading a layer never throws and warns with line numbers", () => {
    const { layer, warnings } = parseLayer(
      "---\nchartdown: 0.6\n---\n> MD: Too early.\n## Chorus\n### Bar two\n> MD kazoo: Loud.\n1 | 4\n@key A\n// fine\n### Bar 2\n> Plain note.",
    );
    expect(warnings.map((w) => [w.line, w.code])).toEqual([
      [2, "unsupported-version"],
      [4, "layer-no-section"],
      [6, "bad-bar-heading"],
      [7, "unknown-instrument"],
      [8, "layer-line"],
      [9, "layer-line"],
    ]);
    expect(layer.notes).toEqual([
      { section: "Chorus", occurrence: 1, roles: ["everyone"], text: "Loud." },
      { section: "Chorus", occurrence: 1, bar: 2, roles: ["everyone"], text: "Plain note." },
    ]);
    for (const input of ["", "---", "###", "## \n### Bar 0", "> x", "\u0000"])
      expect(() => parseLayer(input)).not.toThrow();
  });

  it("R-00.2 resolves instruments with the Admin's catalog", () => {
    const { layer } = parseLayer("## Chorus\n> MD kit: In.", {
      instruments: [{ id: "drums", names: ["kit"] }],
    });
    expect(layer.notes[0]?.roles).toEqual(["drums"]);
  });

  it("R-00.2 keeps the app's note ids through placement", () => {
    const layer: Layer = { notes: [note({ id: "n-1" })] };
    expect(placeLayer(parse(CHART), layer).sections[1]?.[0]?.note.id).toBe("n-1");
  });
});
