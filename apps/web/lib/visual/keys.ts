// The editor's undo and redo keys (R-13.11).

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
