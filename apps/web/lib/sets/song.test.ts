import { parse } from "@chartdown/core";
import { describe, expect, it } from "vitest";
import { songView, viewAs, viewAsOptions, type SetSong } from "./song";

const chart = parse(
  "## Verse\n> MD: Author: everyone soft.\n> MD bass: Author: bass out.\n> MD keys: Author: keys pad.\n1 | 4\n\n## Chorus\n4 | 5\n",
);
const note = (
  id: string,
  section: string,
  text: string,
  instruments: string[] = [],
  bar: number | null = null,
) => ({
  id,
  section,
  occurrence: 1,
  bar,
  text,
  anchored_revision_id: "r1",
  instruments,
});
const song = (overrides: Partial<SetSong> = {}) => ({
  role: "musician" as const,
  instruments: ["keys"],
  hide_author_notes: false,
  // As the server sends them to a keys player: general and keys only.
  notes: [note("n1", "Chorus", "Big chorus."), note("n2", "Chorus", "Pad up.", ["keys"], 2)],
  ...overrides,
});
const texts = (view: ReturnType<typeof songView>, index: number) =>
  (view.sections[index] ?? []).map((shown) => shown.text);

describe("R-06.2 a set's song for each musician", () => {
  it("R-06.2 a keys player sees the general and keys notes of the author and the band", () => {
    const view = songView(chart, song());
    expect(texts(view, 0)).toEqual(["Author: everyone soft.", "Author: keys pad."]);
    expect(texts(view, 1)).toEqual(["Big chorus.", "Pad up."]);
    expect(view.sections[1]?.[1]).toMatchObject({ bar: 2, forYou: true, roles: ["keys"] });
    expect(view.forYou).toBe(2);
  });

  it("R-06.3 the MD and the temporary MD see every note of the author", () => {
    expect(texts(songView(chart, song({ role: "md" })), 0)).toHaveLength(3);
    expect(texts(songView(chart, song({ role: "temp_md", instruments: [] })), 0)).toHaveLength(3);
  });

  it("R-06.6 the band hides the author's notes", () => {
    const view = songView(chart, song({ hide_author_notes: true }));
    expect(texts(view, 0)).toEqual([]);
    expect(texts(view, 1)).toEqual(["Big chorus.", "Pad up."]);
  });

  it("R-00.2 a band note whose section is gone is kept apart, not lost", () => {
    const view = songView(chart, song({ notes: [note("n3", "Bridge", "Build it.")] }));
    expect(view.unplaced.map((item) => [item.note.text, item.reason])).toEqual([
      ["Build it.", "section"],
    ]);
  });
});

describe("R-06.3 View as, for the MD", () => {
  // The MD receives every note from the server.
  const all = song({
    role: "md",
    instruments: [],
    notes: [
      note("n1", "Chorus", "Big chorus."),
      note("n2", "Chorus", "Pad up.", ["keys"], 2),
      note("n3", "Verse", "Bass out.", ["bass"]),
    ],
  });

  it("R-06.3 all notes for the MD, with every instrument's note marked", () => {
    const view = songView(chart, all);
    expect(view.sections.flat().map((shown) => shown.text)).toHaveLength(6);
    expect(view.sections[0]?.filter((shown) => shown.forYou).map((shown) => shown.text)).toEqual([
      "Author: bass out.",
      "Author: keys pad.",
      "Bass out.",
    ]);
  });

  it("R-06.3 view as bass shows the general and bass notes only", () => {
    const view = songView(chart, viewAs(all, "bass"));
    expect(texts(view, 0)).toEqual(["Author: everyone soft.", "Author: bass out.", "Bass out."]);
    expect(texts(view, 1)).toEqual(["Big chorus."]);
    expect(view.forYou).toBe(2);
  });

  it("R-06.3 a musician cannot view as another instrument", () => {
    const musician = song();
    expect(viewAs(musician, "bass")).toBe(musician);
    expect(viewAs(all, "all")).toBe(all);
  });

  it("R-06.3 the choices are the instruments playing and those with a note", () => {
    expect(viewAsOptions(all, ["drums", "keys"])).toEqual(["bass", "drums", "keys"]);
  });
});
