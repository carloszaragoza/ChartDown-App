// The song's title is written once, in the version's details (R-02.1, T-2404): the editor shows
// the chart without its `title:` header line, and saving writes the title back into the header.

const FIELD = /^\s*title\s*:\s*/i;

/** The header's closing line, or -1 when the chart has no closed header. */
function headerEnd(lines: string[]): number {
  if (lines[0]?.trim() !== "---") return -1;
  return lines.findIndex((line, index) => index > 0 && line.trim() === "---");
}

/**
 * The chart's title and the chart without its `title:` line; a header left empty goes too.
 * `removed` lists the lines taken out (from 1), to move a line number from the chart to the body.
 */
export function splitTitle(content: string): {
  title: string | null;
  body: string;
  removed: number[];
} {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const end = headerEnd(lines);
  const at = lines.findIndex((line, index) => index > 0 && index < end && FIELD.test(line));
  if (at === -1) return { title: null, body: content, removed: [] };
  const title = (lines[at] as string)
    .replace(FIELD, "")
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2");
  lines.splice(at, 1);
  const removed = [at + 1];
  if (end - 1 === 1) {
    lines.splice(0, 2);
    removed.push(1, end + 1);
  }
  return { title: title || null, body: lines.join(newline), removed: removed.sort((a, b) => a - b) };
}

/** The chart with the title as its header's `title:` line, in place of any it had. */
export function withTitle(body: string, title: string): string {
  const name = title.trim();
  if (!name) return body;
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  const lines = splitTitle(body).body.split(/\r?\n/);
  const field = `title: ${name}`;
  if (headerEnd(lines) === -1) return ["---", field, "---", ...lines].join(newline);
  lines.splice(1, 0, field);
  return lines.join(newline);
}

/** A line of the full chart as a line of the body splitTitle left, or null if it was removed. */
export function bodyLine(line: number, removed: number[]): number | null {
  if (removed.includes(line)) return null;
  return line - removed.filter((gone) => gone < line).length;
}
