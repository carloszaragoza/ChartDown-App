import { parseNote, readHeader } from "./header.js";
import { parseRow } from "./row.js";
import type { Chart, Key, Meter, ParseOptions, Row, Section, Warning } from "./types.js";
import { createWarning, type Warn } from "./warnings.js";

/** The ChartDown version this parser reads (R-00.4). */
export const SUPPORTED_VERSION = "0.4";

function parseKey(text: string | undefined): Key {
  const match = /^([A-G][b#]?)(m?)/.exec(text ?? "C");
  return match
    ? { root: match[1] as string, minor: match[2] === "m" }
    : { root: "C", minor: false };
}

function parseMeter(text: string | undefined): Meter {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(text ?? "4/4");
  return match ? { beats: Number(match[1]), unit: Number(match[2]) } : { beats: 4, unit: 4 };
}

/**
 * Parses ChartDown 0.4 text into a chart. Never throws: anything it cannot read is
 * skipped and reported in `warnings` with its line number (spec 13). Instruments come
 * from `options.instruments`, or the spec's standard roles when it is not given (R-00.1).
 */
export function parse(source: string, options: ParseOptions = {}): Chart {
  const warnings: Warning[] = [];
  const warn: Warn = (line, code, values) => warnings.push(createWarning(line, code, values));
  const lines = source.replace(/\r/g, "").split("\n");

  const {
    fields: header,
    version,
    instruments,
    roles,
    bodyStart,
  } = readHeader(lines, SUPPORTED_VERSION, options, warn);
  let index = bodyStart;
  const key = parseKey(header.key);
  const meter = parseMeter(header.meter);

  const sections: Section[] = [];
  const startKeys = new Map<Section, Key>();
  let section: Section | undefined;
  let currentKey = key;
  let pendingKeyChange: Key | undefined;

  for (; index < lines.length; index++) {
    const text = (lines[index] as string).trim();
    const line = index + 1;
    if (!text || text.startsWith("//")) continue;

    if (text.startsWith("##")) {
      section = { name: text.replace(/^#+\s*/, "") || "Section", line, notes: [], rows: [] };
      sections.push(section);
      startKeys.set(section, currentKey);
      continue;
    }
    if (!section) {
      warn(line, "no-section");
      continue;
    }
    if (text.startsWith(">")) {
      section.notes.push(parseNote(text.replace(/^>\s?/, ""), line, roles, warn));
      continue;
    }
    const use = /^@use\s+(.+)$/i.exec(text);
    if (use) {
      section.use = { name: (use[1] as string).trim(), line };
      continue;
    }
    const keyChange = /^@key\s+([A-G][b#]?)(m?)\s*$/.exec(text);
    if (keyChange) {
      currentKey = { root: keyChange[1] as string, minor: keyChange[2] === "m" };
      pendingKeyChange = currentKey;
      continue;
    }
    if (text.startsWith("@")) {
      warn(line, "unknown-directive", { directive: text.split(/\s/)[0] as string });
      continue;
    }

    const bars = parseRow(text, { line, beatsPerBar: meter.beats, roles, warn });
    if (!bars) continue;
    const row: Row = { line, key: { ...currentKey }, bars };
    if (pendingKeyChange) {
      row.keyChange = { ...pendingKeyChange };
      pendingKeyChange = undefined;
    }
    section.rows.push(row);
  }

  // `@use` copies the rows of the first earlier section with that name, in the key
  // in effect where the reusing section starts (spec 5.2). It must be the section's
  // only content line: a section with its own rows keeps them.
  sections.forEach((target, position) => {
    if (target.use === undefined) return;
    if (target.rows.length > 0) {
      warn(target.use.line, "use-with-rows");
      return;
    }
    const name = target.use.name.toLowerCase();
    const original = sections
      .slice(0, position)
      .find((earlier) => earlier.name.toLowerCase() === name && earlier.rows.length > 0);
    if (!original) {
      warn(target.use.line, "use-not-found", { name: target.use.name });
      return;
    }
    const startKey = startKeys.get(target) ?? key;
    target.rows = original.rows.map((row) => ({
      line: row.line,
      key: { ...startKey },
      bars: JSON.parse(JSON.stringify(row.bars)),
    }));
  });

  warnings.sort((a, b) => a.line - b.line);
  const chart: Chart = { header, key, meter, instruments, sections, warnings };
  if (version !== undefined) chart.version = version;
  return chart;
}
