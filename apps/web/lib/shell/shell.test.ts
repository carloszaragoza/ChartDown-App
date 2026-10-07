import { describe, expect, it } from "vitest";
import { currentBand, currentItem, shellHidden, versionOf } from "./shell";

const id = "11111111-2222-3333-4444-555555555555";

describe("T-1301 the app shell", () => {
  it("T-1301 pages that fill the screen have no shell; a visitor's root is the landing page", () => {
    expect(shellHidden("/", false)).toBe(true);
    expect(shellHidden("/", true)).toBe(false);
    expect(shellHidden(`/versions/${id}/stand`, true)).toBe(true);
    expect(shellHidden("/sets/s1/songs/2/stand", true)).toBe(true);
    expect(shellHidden("/offline/set/s1", true)).toBe(true);
    expect(shellHidden("/catalog", false)).toBe(false);
    expect(shellHidden("/standards", true)).toBe(false);
  });

  it("T-1301 the side navigation marks the page's own item", () => {
    expect(currentItem("/notices", null)).toBe("notices");
    expect(currentItem("/sets/s1", null)).toBe("sets");
    expect(currentItem("/songs/x", null)).toBe("catalog");
    expect(currentItem("/versions/new", null)).toBe("newVersion");
    expect(currentItem(`/versions/${id}/edit`, null)).toBe("editor");
    expect(currentItem(`/versions/${id}/notes`, null)).toBe("notes");
    expect(currentItem("/bands/p1/sets", "p1")).toBe("personal");
    expect(currentItem("/bands/b2", "p1")).toBe("bands");
    expect(currentItem("/admin", null)).toBe("overview");
    expect(currentItem("/admin/reports", null)).toBe("reports");
    expect(currentItem("/profile", null)).toBeNull();
  });

  it("T-1301 on a version's pages, the editor and the notes open that version", () => {
    expect(versionOf(`/versions/${id}`)).toBe(id);
    expect(versionOf(`/versions/${id}/notes`)).toBe(id);
    expect(versionOf("/versions/new")).toBeNull();
  });

  it("T-1301 the current band is the one chosen, else a band, else the personal space", () => {
    const bands = [
      { id: "p", name: "Personal space", personal: true },
      { id: "a", name: "LifeStone Church", personal: false },
      { id: "b", name: "Cedar Band", personal: false },
    ];
    expect(currentBand(bands, "b")?.id).toBe("b");
    expect(currentBand(bands, "gone")?.id).toBe("a");
    expect(currentBand(bands, undefined)?.id).toBe("a");
    expect(currentBand([bands[0]!], undefined)?.id).toBe("p");
    expect(currentBand([], undefined)).toBeNull();
  });
});
