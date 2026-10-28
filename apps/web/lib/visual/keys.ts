// The editor's undo and redo keys (R-13.11), and its copy and paste of bars (R-13.10).

export interface HistoryKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** ⌘Z or Ctrl + Z undoes; ⌘⇧Z, Ctrl + Shift + Z or Ctrl + Y redoes. */
export function historyKey(event: HistoryKeyEvent): "undo" | "redo" | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && event.ctrlKey && !event.shiftKey) return "redo";
  return null;
}

/** ⌘C or Ctrl + C copies the selected bar; ⌘V or Ctrl + V pastes over it. */
export function clipboardKey(event: HistoryKeyEvent): "copy" | "paste" | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return null;
  const key = event.key.toLowerCase();
  if (key === "c") return "copy";
  if (key === "v") return "paste";
  return null;
}
