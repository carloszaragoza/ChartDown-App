import { describe, expect, it } from "vitest";
import type { SetSong } from "../sets/song";
import { setChanges } from "./changes";
import type { SetBundle } from "./store";

const song = (
  item: string,
  position: number,
  title: string,
  extra: Partial<SetSong> = {},
): SetSong => ({
  set_id: "s1",
  set_name: "Sunday",
  position,
  item_id: item,
  version_id: `v-${item}`,
  title,
  author_name: "Ana",
  set_key: null,
  revision_id: "r1",
  revision_number: 1,
  current_revision_id: "r1",
  content: "## Verse\n1",
  role: "musician",
  instruments: ["keys"],
  hide_author_notes: false,
  notes: [],
  ...extra,
});
const note = (id: string, text: string, section = "Chorus") => ({
  id,
  section,
  occurrence: 1,
  bar: null,
  text,
  anchored_revision_id: "r1",
  instruments: ["keys"],
});
const bundle = (extra: Partial<SetBundle> = {}): SetBundle => ({
  set: {
    id: "s1",
    name: "Sunday",
    type: "service",
    date: "2030-06-09",
    time: "09:00:00",
    band: "Harbor",
    personal: false,
  },
  lineup: [{ name: "Ben", role: "musician", instruments: ["keys"] }],
  songs: [song("a", 1, "Alpha", { notes: [note("n1", "Pad up.")] }), song("b", 2, "Bravo")],
  anchored: {},
  stamp: "one",
  ...extra,
});

describe("R-08.3 what changed in a downloaded set", () => {
  it("R-08.3 nothing, when the stamp is the same", () => {
    expect(setChanges(bundle(), bundle({ songs: [] }))).toEqual([]);
  });

  it("R-08.3 the set's name, date and time", () => {
    const after = bundle({
      stamp: "two",
      set: { ...bundle().set, name: "Sunday PM", time: "18:00:00" },
    });
    expect(setChanges(bundle(), after)).toEqual([
      { kind: "name", from: "Sunday", to: "Sunday PM" },
      { kind: "when", from: "2030-06-09 09:00", to: "2030-06-09 18:00" },
    ]);
  });

  it("R-08.3 songs added, removed and moved, keys and new revisions", () => {
    const after = bundle({
      stamp: "two",
      songs: [song("b", 1, "Bravo", { set_key: "A", revision_number: 2 }), song("c", 2, "Charlie")],
    });
    expect(setChanges(bundle(), after)).toEqual([
      { kind: "songMoved", title: "Bravo", from: 2, to: 1 },
      { kind: "key", title: "Bravo", from: null, to: "A" },
      { kind: "revision", title: "Bravo", from: 1, to: 2 },
      { kind: "songAdded", title: "Charlie" },
      { kind: "songRemoved", title: "Alpha" },
    ]);
  });

  it("R-08.3 the person's notes added, changed and removed, with their section", () => {
    const after = bundle({
      stamp: "two",
      songs: [
        song("a", 1, "Alpha", {
          notes: [note("n1", "Pad up an octave."), note("n2", "Out first pass.", "Verse")],
        }),
        song("b", 2, "Bravo"),
      ],
    });
    expect(setChanges(bundle(), after)).toEqual([
      { kind: "noteChanged", title: "Alpha", section: "Chorus", text: "Pad up an octave." },
      { kind: "noteAdded", title: "Alpha", section: "Verse", text: "Out first pass." },
    ]);
    const removed = bundle({
      stamp: "three",
      songs: [song("a", 1, "Alpha"), song("b", 2, "Bravo")],
    });
    expect(setChanges(bundle(), removed)).toEqual([
      { kind: "noteRemoved", title: "Alpha", section: "Chorus", text: "Pad up." },
    ]);
  });

  it("R-08.3 the lineup", () => {
    const after = bundle({
      stamp: "two",
      lineup: [{ name: "Ben", role: "musician", instruments: ["bass", "keys"] }],
    });
    expect(setChanges(bundle(), after)).toEqual([
      { kind: "lineup", name: "Ben", from: ["keys"], to: ["bass", "keys"] },
    ]);
  });
});
