import { describe, expect, it } from "vitest";
import { clipboardKey, historyKey } from "./keys";

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

describe("T-3006 the editor's copy and paste keys", () => {
  it("R-13.10 ⌘C or Ctrl + C copies a bar; ⌘V or Ctrl + V pastes over it", () => {
    expect(clipboardKey(press("c", { meta: true }))).toBe("copy");
    expect(clipboardKey(press("c", { ctrl: true }))).toBe("copy");
    expect(clipboardKey(press("v", { meta: true }))).toBe("paste");
    expect(clipboardKey(press("V", { ctrl: true }))).toBe("paste");
  });

  it("R-13.10 shifted, optioned or plain keys are left alone", () => {
    expect(clipboardKey(press("v", { meta: true, shift: true }))).toBeNull();
    expect(clipboardKey(press("c", { ctrl: true, alt: true }))).toBeNull();
    expect(clipboardKey(press("c", {}))).toBeNull();
    expect(clipboardKey(press("z", { meta: true }))).toBeNull();
  });
});
