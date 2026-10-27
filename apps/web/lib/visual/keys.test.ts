import { describe, expect, it } from "vitest";
import { historyKey } from "./keys";

const press = (key: string, keys: Partial<Record<"meta" | "ctrl" | "shift" | "alt", boolean>>) => ({
  key,
  metaKey: keys.meta ?? false,
  ctrlKey: keys.ctrl ?? false,
  shiftKey: keys.shift ?? false,
  altKey: keys.alt ?? false,
});

describe("T-3003 the editor's undo and redo keys", () => {
  it("R-13.11 ⌘Z or Ctrl + Z undoes; ⌘⇧Z, Ctrl + Shift + Z or Ctrl + Y redoes", () => {
    expect(historyKey(press("z", { meta: true }))).toBe("undo");
    expect(historyKey(press("z", { ctrl: true }))).toBe("undo");
    expect(historyKey(press("Z", { meta: true, shift: true }))).toBe("redo");
    expect(historyKey(press("Z", { ctrl: true, shift: true }))).toBe("redo");
    expect(historyKey(press("y", { ctrl: true }))).toBe("redo");
  });

  it("R-13.11 other keys are left alone", () => {
    expect(historyKey(press("z", {}))).toBeNull();
    expect(historyKey(press("z", { meta: true, alt: true }))).toBeNull();
    expect(historyKey(press("s", { meta: true }))).toBeNull();
  });
});
