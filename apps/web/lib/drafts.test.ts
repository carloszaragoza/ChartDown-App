import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetAllDrafts, forgetDraft, isOffered, readDraft, writeDraft } from "./drafts";

// A browser's storage, as the editors find it.
const storage = () => {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    getItem: (name: string) => items.get(name) ?? null,
    setItem: (name: string, value: string) => void items.set(name, value),
    removeItem: (name: string) => void items.delete(name),
  };
};

describe("T-3022 what an editor keeps in the browser", () => {
  beforeEach(() => vi.stubGlobal("window", { localStorage: storage() }));
  afterEach(() => vi.unstubAllGlobals());

  it("R-02.12 the chart being written is kept, read back and forgotten", () => {
    expect(readDraft("v1")).toBeNull();
    writeDraft("v1", { content: "## Verse\n1 | 4\n", base: "r1", at: 1000 });
    expect(readDraft("v1")).toEqual({ content: "## Verse\n1 | 4\n", base: "r1", at: 1000 });
    expect(readDraft("v2")).toBeNull();
    forgetDraft("v1");
    expect(readDraft("v1")).toBeNull();
  });

  it("R-02.12 signing out forgets every draft, and nothing else", () => {
    writeDraft("v1", { content: "a", base: "r1", at: 1 });
    writeDraft("v2", { content: "b", base: "r2", at: 2 });
    window.localStorage.setItem("chartdown:beats", "always");
    forgetAllDrafts();
    expect(readDraft("v1")).toBeNull();
    expect(readDraft("v2")).toBeNull();
    expect(window.localStorage.getItem("chartdown:beats")).toBe("always");
  });

  it("R-02.12 a draft is offered only when it isn't what the editor opened with", () => {
    const draft = { content: "## Verse\n1 | 4\n", base: "r1", at: 1 };
    expect(isOffered(draft, "## Verse\n1\n")).toBe(true);
    expect(isOffered(draft, "## Verse\n1 | 4\n")).toBe(false);
    expect(isOffered(null, "")).toBe(false);
  });

  it("R-02.12 without storage nothing is kept, and nothing breaks", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    });
    expect(() => writeDraft("v1", { content: "a", base: "r", at: 1 })).not.toThrow();
    expect(readDraft("v1")).toBeNull();
    expect(() => forgetAllDrafts()).not.toThrow();
  });

  it("R-02.12 something else stored under its name is never taken for a draft", () => {
    window.localStorage.setItem("chartdown:draft:v1", "not json");
    expect(readDraft("v1")).toBeNull();
    window.localStorage.setItem("chartdown:draft:v1", JSON.stringify({ content: 1 }));
    expect(readDraft("v1")).toBeNull();
  });
});
