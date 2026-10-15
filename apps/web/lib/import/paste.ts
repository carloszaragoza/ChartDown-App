// A pasted chord sheet, checked before it is converted (R-10.13).

/** The longest sheet a paste may hold. */
export const MAX_LINES = 300;

/** Whether a pasted sheet can be imported: something to read, no longer than 300 lines. */
export function readPaste(text: string): "empty" | "too_long" | "ok" {
  if (text.trim() === "") return "empty";
  if (text.split(/\r\n?|\n/).length > MAX_LINES) return "too_long";
  return "ok";
}
