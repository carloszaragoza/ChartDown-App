import { READABLE_VERSIONS, SUPPORTED_VERSION } from "chartdown";

/**
 * The chart as the app saves it (R-00.4): it declares the ChartDown version of the app's parser.
 * A chart with no header gets one, a header with no `chartdown` field gets the field first, and a
 * chart written for 0.3 to 0.5 is brought to 0.6, which reads it the same. A version this parser
 * does not read, such as a later one, stays as it was written, so nothing is lost.
 */
export function withChartVersion(content: string): string {
  if (content.trim() === "") return content;
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const field = `chartdown: ${SUPPORTED_VERSION}`;

  if (lines[0]?.trim() !== "---") return ["---", field, "---", ...lines].join(newline);

  // The header ends at its closing line; one never closed ends at the first section.
  let end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) end = lines.findIndex((line, index) => index > 0 && line.trim().startsWith("##"));
  if (end === -1) end = lines.length;

  const at = lines.findIndex(
    (line, index) => index > 0 && index < end && /^\s*chartdown\s*:/i.test(line),
  );
  if (at === -1) {
    lines.splice(1, 0, field);
    return lines.join(newline);
  }
  const declared = (lines[at] as string).replace(/^\s*chartdown\s*:\s*/i, "").trim();
  if (declared !== SUPPORTED_VERSION && READABLE_VERSIONS.includes(declared)) lines[at] = field;
  return lines.join(newline);
}
