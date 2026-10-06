import { parse, placeLayer } from "chartdown";
import { describe, expect, it } from "vitest";
import { readNoteForm, sectionAnchors, toLayer, type NoteRow } from "./notes";

const chart = parse("## Verse\n1 | 4\n## Chorus\n4 | 5\n## Chorus\n4 | 1 | 5 | 1\n");
const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields))
    for (const item of [value].flat()) data.append(name, item);
  return data;
};

describe("R-03.5 the note form", () => {
  it("R-03.5 the sections are offered by name and occurrence", () => {
    expect(sectionAnchors(chart)).toEqual([
      { value: "Verse|1", name: "Verse", occurrence: 1, count: 1 },
      { value: "Chorus|1", name: "Chorus", occurrence: 1, count: 2 },
      { value: "Chorus|2", name: "Chorus", occurrence: 2, count: 2 },
    ]);
  });

  it("R-03.5 a note has a section, an optional bar, its instruments and one line of text", () => {
    expect(
      readNoteForm(
        form({
          anchor: "Chorus|2",
          bar: "3",
          text: " Pad swell\ninto the end ",
          instrument: ["k", "k", "b"],
        }),
      ),
    ).toEqual({
      input: {
        section: "Chorus",
        occurrence: 2,
        bar: 3,
        text: "Pad swell into the end",
        instrumentIds: ["k", "b"],
      },
    });
    expect(readNoteForm(form({ anchor: "Verse|1", text: "Soft." }))).toMatchObject({
      input: { bar: null, instrumentIds: [] },
    });
  });

  it("R-03.5 a note needs a section, a whole bar and at most 280 characters", () => {
    expect(readNoteForm(form({ anchor: "", text: "x" }))).toEqual({ error: "section_required" });
    expect(readNoteForm(form({ anchor: "Verse|1", bar: "0", text: "x" }))).toEqual({
      error: "bar_invalid",
    });
    expect(readNoteForm(form({ anchor: "Verse|1", text: "  " }))).toEqual({
      error: "text_required",
    });
    expect(readNoteForm(form({ anchor: "Verse|1", text: "x".repeat(281) }))).toEqual({
      error: "text_too_long",
    });
  });

  it("R-03.5 the band's notes land on the chart: no instruments means everyone", () => {
    const rows: NoteRow[] = [
      {
        id: "n1",
        section: "Chorus",
        occurrence: 2,
        bar: 2,
        text: "Keys pad.",
        anchored_revision_id: "r1",
        instruments: [{ instrument_id: "i-keys" }],
      },
      {
        id: "n2",
        section: "Verse",
        occurrence: 1,
        bar: null,
        text: "Everyone soft.",
        anchored_revision_id: "r1",
        instruments: [],
      },
    ];
    const layer = toLayer(rows, (id) => (id === "i-keys" ? "keys" : undefined));
    expect(layer.notes.map((note) => note.roles)).toEqual([["keys"], ["everyone"]]);
    const placed = placeLayer(chart, layer);
    expect(placed.sections[2]?.map((item) => item.note.id)).toEqual(["n1"]);
    expect(placed.sections[0]?.map((item) => item.note.id)).toEqual(["n2"]);
    expect(placed.unplaced).toEqual([]);
  });
});
