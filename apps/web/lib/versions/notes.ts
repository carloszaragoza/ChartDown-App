import { EVERYONE, type Chart, type Layer } from "chartdown";

/** A section a note can be anchored to: its name and which one of that name it is (R-00.2). */
export interface SectionAnchor {
  /** "name|occurrence", as the note form sends it. */
  value: string;
  name: string;
  occurrence: number;
  /** How many sections share this name, so the form only says "2nd" when it matters. */
  count: number;
}

export function sectionAnchors(chart: Chart): SectionAnchor[] {
  const seen = new Map<string, number>();
  const anchors = chart.sections.map((section) => {
    const key = section.name.trim().toLowerCase();
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return {
      value: `${section.name.trim()}|${occurrence}`,
      name: section.name.trim(),
      occurrence,
      key,
    };
  });
  return anchors.map(({ key, ...anchor }) => ({ ...anchor, count: seen.get(key) ?? 1 }));
}

export const NOTE_MAX = 280;

export type NoteError = "section_required" | "bar_invalid" | "text_required" | "text_too_long";

export interface NoteInput {
  section: string;
  occurrence: number;
  bar: number | null;
  text: string;
  instrumentIds: string[];
}

/** Checks a note before it is sent (R-03.5); the database checks the same rules. */
export function readNoteForm(form: FormData): { error: NoteError } | { input: NoteInput } {
  const [section = "", occurrenceText = ""] = String(form.get("anchor") ?? "").split("|");
  const occurrence = Number(occurrenceText);
  if (!section.trim() || !Number.isInteger(occurrence) || occurrence < 1)
    return { error: "section_required" };
  const barText = String(form.get("bar") ?? "").trim();
  const bar = barText === "" ? null : Number(barText);
  if (bar !== null && (!Number.isInteger(bar) || bar < 1)) return { error: "bar_invalid" };
  // One line: line breaks become spaces.
  const text = String(form.get("text") ?? "")
    .replace(/\s*[\r\n]+\s*/g, " ")
    .trim();
  if (!text) return { error: "text_required" };
  if (text.length > NOTE_MAX) return { error: "text_too_long" };
  const instrumentIds = [...new Set(form.getAll("instrument").map(String))];
  return { input: { section: section.trim(), occurrence, bar, text, instrumentIds } };
}

export interface NoteRow {
  id: string;
  section: string;
  occurrence: number;
  bar: number | null;
  text: string;
  anchored_revision_id: string;
  instruments: { instrument_id: string }[];
}

/** The band's notes as a layer for chartdown: roles are instrument slugs, or everyone. */
export function toLayer(
  rows: NoteRow[],
  slugOf: (instrumentId: string) => string | undefined,
): Layer {
  return {
    notes: rows.map((row) => {
      const roles = row.instruments
        .map((instrument) => slugOf(instrument.instrument_id))
        .filter((slug): slug is string => Boolean(slug));
      return {
        id: row.id,
        revision: row.anchored_revision_id,
        section: row.section,
        occurrence: row.occurrence,
        ...(row.bar ? { bar: row.bar } : {}),
        roles: roles.length > 0 ? roles : [EVERYONE],
        text: row.text,
      };
    }),
  };
}
