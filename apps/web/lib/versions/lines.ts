/** Where a line of a text starts and ends, as character offsets; lines count from 1 (R-03.1). */
export function lineRange(text: string, line: number): { start: number; end: number } {
  let start = 0;
  for (let current = 1; current < line; current += 1) {
    const next = text.indexOf("\n", start);
    if (next === -1) return { start: text.length, end: text.length };
    start = next + 1;
  }
  const end = text.indexOf("\n", start);
  return { start, end: end === -1 ? text.length : end };
}

/**
 * A chart's text with every line break as \n. Browsers send form text with \r\n, so what is
 * saved would otherwise differ from what the editor holds.
 */
export function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}
