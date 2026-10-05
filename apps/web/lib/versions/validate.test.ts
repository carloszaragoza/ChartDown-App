import { describe, expect, it } from "vitest";
import { validateVersion, type VersionValues } from "./validate";

const SONG = "00000000-0000-0000-0000-000000000501";
const filled: VersionValues = {
  songId: "",
  title: " Lantern Bay ",
  artists: "Ana, , Ben ",
  author: " Ana ",
  content: "## Verse\n1 | 4",
  sourceType: "live",
  album: "",
  year: "",
  youtube: "",
};
const check = (changes: Partial<VersionValues>) => validateVersion({ ...filled, ...changes });

describe("validateVersion", () => {
  it("R-02.1 a new song takes its title and artists", () => {
    expect(check({})).toEqual({
      input: {
        song_id: null,
        new_title: "Lantern Bay",
        new_artists: ["Ana", "Ben"],
        author_name: "Ana",
        content: "## Verse\n1 | 4",
        source_type: "live",
        source_album: null,
        source_year: null,
        source_youtube_url: null,
      },
    });
  });

  it("R-02.1 an existing song needs no title", () => {
    const result = check({ songId: SONG, title: "" });
    expect(result).toMatchObject({ input: { song_id: SONG, new_title: null, new_artists: null } });
  });

  it("R-02.1 a new song needs a title, the author a name and the chart some content", () => {
    expect(check({ title: "  " })).toEqual({ error: "title_required" });
    expect(check({ author: "" })).toEqual({ error: "author_required" });
    expect(check({ content: " \n " })).toEqual({ error: "chart_required" });
  });

  it("R-02.2 saving without a source is refused with its own error", () => {
    expect(check({ sourceType: "" })).toEqual({ error: "source_required" });
    expect(check({ sourceType: "bootleg" })).toEqual({ error: "source_required" });
  });

  it("R-02.2 album, year and YouTube link are optional but checked", () => {
    expect(
      check({ album: " Demos ", year: "2026", youtube: "https://youtu.be/abc" }),
    ).toMatchObject({
      input: {
        source_album: "Demos",
        source_year: 2026,
        source_youtube_url: "https://youtu.be/abc",
      },
    });
    expect(check({ year: "26.5" })).toEqual({ error: "year_invalid" });
    expect(check({ year: "1700" })).toEqual({ error: "year_invalid" });
    expect(check({ youtube: "https://example.test/watch" })).toEqual({ error: "youtube_invalid" });
  });

  it("R-02.1 parser warnings do not stop a save", () => {
    expect(check({ content: "## Verse\n1 | ??? | 4" })).toHaveProperty("input");
  });
});
