import { describe, expect, it, vi } from "vitest";

vi.mock("../../actions", () => ({ moveItem: vi.fn(), removeItem: vi.fn() }));

const { arrange } = await import("./ArrangedSongs");

const songs = [{ id: "a" }, { id: "b" }, { id: "c" }];
const ids = (list: { id: string }[]) => list.map((song) => song.id).join("");

describe("F-006 Edit set shows a change before the server answers", () => {
  it("F-006 a song moves up or down at once", () => {
    expect(ids(arrange(songs, { type: "move", id: "b", by: -1 }))).toBe("bac");
    expect(ids(arrange(songs, { type: "move", id: "b", by: 1 }))).toBe("acb");
  });

  it("F-006 a removed song leaves the list at once", () => {
    expect(ids(arrange(songs, { type: "remove", id: "a" }))).toBe("bc");
  });

  it("F-006 a move past either end, or of a song no longer there, changes nothing", () => {
    expect(ids(arrange(songs, { type: "move", id: "a", by: -1 }))).toBe("abc");
    expect(ids(arrange(songs, { type: "move", id: "c", by: 1 }))).toBe("abc");
    expect(ids(arrange(songs, { type: "remove", id: "z" }))).toBe("abc");
  });
});
