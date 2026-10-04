import { parseNote, readHeader } from "./header.js";
import { EVERYONE, STANDARD_INSTRUMENTS } from "./roles.js";
import type {
  Chart,
  Layer,
  LayerNote,
  ParsedLayer,
  ParseOptions,
  PlaceOptions,
  PlacedNote,
  Placement,
  UnplacedNote,
  Warning,
} from "./types.js";
import { createWarning, type Warn } from "./warnings.js";

/** The layer format version this package reads and writes (specs/chartdown-layers-0.5.md). */
export const LAYER_VERSION = "0.5";

/** Section names match ignoring case and surrounding spaces, and nothing looser. */
const sameName = (name: string) => name.trim().toLowerCase();

interface Anchor {
  section: string;
  occurrence: number;
  bar?: number;
}

/**
 * Reads a layer in its text form. Never throws: anything it cannot read is skipped
 * and reported with its line number. Instruments resolve as in charts (R-00.1).
 */
export function parseLayer(source: string, options: ParseOptions = {}): ParsedLayer {
  const warnings: Warning[] = [];
  const warn: Warn = (line, code, values) => warnings.push(createWarning(line, code, values));
  const lines = source.replace(/\r/g, "").split("\n");
  const { fields, version, instruments, roles, bodyStart } = readHeader(
    lines,
    LAYER_VERSION,
    options,
    warn,
  );

  const notes: LayerNote[] = [];
  const occurrences = new Map<string, number>();
  let anchor: Anchor | undefined;

  for (let index = bodyStart; index < lines.length; index++) {
    const text = (lines[index] as string).trim();
    const line = index + 1;
    if (!text || text.startsWith("//")) continue;

    if (text.startsWith("###")) {
      if (!anchor) {
        warn(line, "layer-no-section");
        continue;
      }
      const bar = Number(/^###\s*bar\s+(\d+)\s*$/i.exec(text)?.[1] ?? 0);
      anchor = { section: anchor.section, occurrence: anchor.occurrence };
      if (bar >= 1) anchor.bar = bar;
      else warn(line, "bad-bar-heading");
      continue;
    }
    if (text.startsWith("##")) {
      const section = text.replace(/^#+\s*/, "") || "Section";
      const occurrence = (occurrences.get(sameName(section)) ?? 0) + 1;
      occurrences.set(sameName(section), occurrence);
      anchor = { section, occurrence };
      continue;
    }
    if (text.startsWith(">")) {
      if (!anchor) {
        warn(line, "layer-no-section");
        continue;
      }
      const note = parseNote(text.replace(/^>\s?/, ""), line, roles, warn);
      const layerNote: LayerNote = {
        section: anchor.section,
        occurrence: anchor.occurrence,
        roles: note.roles,
        text: note.text,
      };
      if (anchor.bar !== undefined) layerNote.bar = anchor.bar;
      notes.push(layerNote);
      continue;
    }
    warn(line, "layer-line");
  }

  warnings.sort((a, b) => a.line - b.line);
  const layer: Layer = { notes };
  if (fields.layer) layer.title = fields.layer;
  const parsed: ParsedLayer = { layer, header: fields, instruments, warnings };
  if (version !== undefined) parsed.version = version;
  return parsed;
}

function assertAnchor(note: LayerNote): void {
  if (!Number.isInteger(note.occurrence) || note.occurrence < 1) {
    throw new RangeError(
      `Layer note occurrence must be a whole number from 1, got ${note.occurrence}`,
    );
  }
  if (note.bar !== undefined && (!Number.isInteger(note.bar) || note.bar < 1)) {
    throw new RangeError(`Layer note bar must be a whole number from 1, got ${note.bar}`);
  }
}

/**
 * Writes a layer in its text form: notes grouped by section name and occurrence, with
 * the empty headings needed to reach later occurrences, then by bar. Instruments that
 * are not in the catalog are declared in the header so the layer reads back the same.
 * Note text is written on one line. Throws on an occurrence or bar below 1, which
 * cannot be written without changing the note's anchor.
 */
export function formatLayer(layer: Layer, options: ParseOptions = {}): string {
  const known = new Set<string>([EVERYONE]);
  for (const instrument of options.instruments ?? STANDARD_INSTRUMENTS) known.add(instrument.id);

  const custom: string[] = [];
  const groups = new Map<string, { name: string; occurrences: Map<number, LayerNote[]> }>();
  for (const note of layer.notes) {
    assertAnchor(note);
    for (const role of note.roles)
      if (!known.has(role) && !custom.includes(role)) custom.push(role);
    const key = sameName(note.section);
    const group = groups.get(key) ?? { name: note.section.trim(), occurrences: new Map() };
    groups.set(key, group);
    group.occurrences.set(note.occurrence, [
      ...(group.occurrences.get(note.occurrence) ?? []),
      note,
    ]);
  }

  const out = ["---", `chartdown: ${LAYER_VERSION}`];
  if (layer.title) out.push(`layer: ${layer.title}`);
  if (custom.length > 0) out.push(`instruments: ${custom.join(", ")}`);
  out.push("---");

  const noteLine = (note: LayerNote) => {
    const text = note.text.replace(/\s*\n\s*/g, " ");
    const forEveryone = note.roles.length === 0 || note.roles.includes(EVERYONE);
    return forEveryone ? `> MD: ${text}` : `> MD ${note.roles.join(", ")}: ${text}`;
  };

  let first = true;
  for (const { name, occurrences } of groups.values()) {
    const last = Math.max(...occurrences.keys());
    for (let occurrence = 1; occurrence <= last; occurrence++) {
      if (!first) out.push("");
      first = false;
      out.push(`## ${name}`);
      const notes = occurrences.get(occurrence) ?? [];
      for (const note of notes.filter((n) => n.bar === undefined)) out.push(noteLine(note));
      const bars = [...new Set(notes.flatMap((n) => (n.bar === undefined ? [] : [n.bar])))].sort(
        (a, b) => a - b,
      );
      for (const bar of bars) {
        out.push(`### Bar ${bar}`);
        for (const note of notes.filter((n) => n.bar === bar)) out.push(noteLine(note));
      }
    }
  }
  return `${out.join("\n")}\n`;
}

const countNamed = (chart: Chart, name: string) =>
  chart.sections.filter((section) => sameName(section.name) === name).length;

/**
 * Places a layer on a chart (R-00.2). Each note lands on the section with its name and
 * occurrence, and on its bar. A note whose anchor is not in the chart is unplaced, with
 * the reason, and is never moved elsewhere, changed or dropped. When the chart at a
 * note's anchored revision is known and the number of sections with its name changed
 * since, its occurrence may point elsewhere, so the note is unplaced too.
 */
export function placeLayer(chart: Chart, layer: Layer, options: PlaceOptions = {}): Placement {
  const sections: PlacedNote[][] = chart.sections.map(() => []);
  const unplaced: UnplacedNote[] = [];

  for (const note of layer.notes) {
    const name = sameName(note.section);
    const matches = chart.sections.flatMap((section, index) =>
      sameName(section.name) === name ? [index] : [],
    );
    const anchored =
      note.revision === undefined ? undefined : options.anchoredChart?.(note.revision);
    const shifted = anchored !== undefined && countNamed(anchored, name) !== matches.length;
    const index =
      !shifted && Number.isInteger(note.occurrence) && note.occurrence >= 1
        ? matches[note.occurrence - 1]
        : undefined;
    const section = index === undefined ? undefined : chart.sections[index];
    if (index === undefined || section === undefined) {
      unplaced.push({ note, reason: "section" });
      continue;
    }
    if (note.bar === undefined) {
      sections[index]?.push({ note });
      continue;
    }
    const bars = section.rows.reduce((total, row) => total + row.bars.length, 0);
    if (!Number.isInteger(note.bar) || note.bar < 1 || note.bar > bars) {
      unplaced.push({ note, reason: "bar" });
      continue;
    }
    sections[index]?.push({ note, bar: note.bar });
  }
  return { sections, unplaced };
}
