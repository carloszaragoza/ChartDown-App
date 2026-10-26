import { describe, expect, it } from "vitest";
import { setSongLinks } from "./standHref";

describe("T-2846 the set's songs in stand mode", () => {
  it("R-03.13 lists the songs in order, marks the one being read and links each with the view kept", () => {
    const songs = setSongLinks(
      [
        { position: 2, title: "Ember", key: "A" },
        { position: 1, title: "Harbor", key: "G" },
        { position: 3, title: "Last Light", key: "D" },
      ],
      2,
      (n) => `/sets/s1/songs/${n}/stand?view=letters`,
    );
    expect(songs.map((song) => [song.position, song.title, song.key, song.current])).toEqual([
      [1, "Harbor", "G", false],
      [2, "Ember", "A", true],
      [3, "Last Light", "D", false],
    ]);
    // Each opens at its first section: no section in the link.
    expect(songs[2]?.href).toBe("/sets/s1/songs/3/stand?view=letters");
  });
});
