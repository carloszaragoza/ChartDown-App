import { beforeEach, describe, expect, it, vi } from "vitest";

// The device's storage, as the browser keeps it between pages.
const stored = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  },
});

describe("R-03.12 T-2843 Show notes is kept on the device", () => {
  beforeEach(() => {
    vi.resetModules();
    stored.clear();
  });

  it("R-03.12 the notes show until the reader hides them", async () => {
    const { hiddenNotes } = await import("./notes");
    expect(hiddenNotes.get()).toBe(false);
    expect(hiddenNotes.server()).toBe(false);
  });

  it("R-03.12 hiding the notes is kept for the next page", async () => {
    const first = await import("./notes");
    const heard = vi.fn();
    first.hiddenNotes.subscribe(heard);
    first.hiddenNotes.set(true);
    expect(heard).toHaveBeenCalled();
    vi.resetModules();
    const again = await import("./notes");
    expect(again.hiddenNotes.get()).toBe(true);
  });
});
