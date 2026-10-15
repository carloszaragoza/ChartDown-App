// A PDF's text layer as lines of text with their columns (SPEC-10, T-1402), so a PDF goes
// through the same converter as a pasted sheet. Pure: pdf.js gives the items, this lays them out.

/** One piece of text as pdf.js gives it: where it starts and how wide it is, in PDF points. */
export interface PdfTextItem {
  str: string;
  x: number;
  /** The baseline, from the page's bottom. */
  y: number;
  width: number;
  height: number;
}

export const MAX_PAGES = 5;
export const MAX_BYTES = 5 * 1024 * 1024;
// Fewer characters than this on every page together means the PDF has no text layer: a scan or a
// photo (R-10.11).
const MIN_TEXT = 12;

/** Whether a PDF's text layer holds enough text to read, or it is a scan (R-10.11). */
export function hasText(pages: PdfTextItem[][]): boolean {
  const characters = pages.flat().reduce((total, item) => total + item.str.trim().length, 0);
  return characters >= MIN_TEXT;
}

/**
 * The page's items as lines, top to bottom; within a line each item starts at its column, so a
 * chord stays over the word it was printed over.
 */
export function pageLines(items: PdfTextItem[]): string[] {
  const words = items.filter((item) => item.str.trim() !== "");
  if (words.length === 0) return [];
  // One character's width, from the text itself, to turn positions into columns.
  const sized = words.filter((item) => item.str.length > 0 && item.width > 0);
  const charWidth =
    sized.reduce((total, item) => total + item.width / item.str.length, 0) /
      Math.max(sized.length, 1) || 5;
  const left = Math.min(...words.map((item) => item.x));
  // Items whose baselines are within half a line of each other share a line.
  const sorted = [...words].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextItem[][] = [];
  for (const item of sorted) {
    const line = lines.at(-1);
    const tolerance = Math.max(item.height, 6) * 0.5;
    if (line && Math.abs((line[0]?.y ?? 0) - item.y) <= tolerance) line.push(item);
    else lines.push([item]);
  }
  const out: string[] = [];
  let previous: number | null = null;
  for (const line of lines) {
    const y = line[0]?.y ?? 0;
    const height = Math.max(...line.map((item) => item.height), 6);
    // A gap of more than a line and a half is a blank line, as between sections.
    if (previous !== null && previous - y > height * 1.9) out.push("");
    previous = y;
    let text = "";
    for (const item of [...line].sort((a, b) => a.x - b.x)) {
      const column = Math.round((item.x - left) / charWidth);
      text = text.length < column ? text.padEnd(column, " ") : text.length > 0 ? `${text} ` : text;
      text += item.str;
    }
    out.push(text.replace(/\s+$/, ""));
  }
  return out;
}

/** Every page's lines, pages apart by a blank line. */
export function pdfText(pages: PdfTextItem[][]): string {
  return pages.map((items) => pageLines(items).join("\n")).join("\n\n");
}
