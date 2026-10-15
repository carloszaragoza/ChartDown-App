import { parse } from "chartdown";
import { keyText, readChord, readKey, writeChord, type SheetChord, type SheetKey } from "./chords";

// Turning a chord sheet (chords written over lyric lines) into a ChartDown draft (SPEC-10,
// T-1403 to T-1407). The sheet is lines of text with their columns, from a paste or a PDF's text
// layer; the draft keeps the song's details, sections and chords, discards the lyrics except a
// short landmark, and says every assumption it made, for the MD to review.

export type ImportStyle = "numbers" | "letters";

export interface ImportOptions {
  style: ImportStyle;
  /** Words of lyric kept as each section's landmark; 0 for none, 8 at most (R-10.7). */
  landmarkWords: number;
}

export type ReviewKind =
  "key-guessed" | "bars-proposed" | "unknown-chord" | "unmapped" | "no-sections" | "chart-warning";

/** One assumption the import made, for the review panel (R-10.8). */
export interface ReviewItem {
  kind: ReviewKind;
  /** The draft's line it is about, from 1, when there is one. */
  line?: number;
  /** The section it is in, when there is one. */
  section?: string;
  /** What was read: a chord, a heading, a key. */
  detail?: string;
}

export interface ImportResult {
  /** The draft, in ChartDown. */
  source: string;
  title: string | null;
  writers: string | null;
  key: string;
  review: ReviewItem[];
  sections: number;
}

export const MAX_LANDMARK_WORDS = 8;
export const DEFAULT_LANDMARK_WORDS = 4;

const HEADING =
  /^\s*\[?\s*(intro|verse|pre[\s-]?chorus|chorus|bridge|instrumental|interlude|turnaround|tag|ending|outro|vamp|refrain|breakdown|solo|coda|hook|verso|estrofa|pre[\s-]?coro|coro|estribillo|puente|interludio|final)(\s*\d+[a-z]?|\s+[a-z])?\s*(?:\(?\s*[x×]\s*(\d+)\s*\)?)?\s*\]?\s*:?\s*$/i;
const SKIP =
  /copyright|©|\(c\)\s*\d|ccli|licen[cs]e|all rights reserved|used by permission|www\.|https?:\/\//i;
const WRITERS =
  /^\s*(?:words\s+and\s+music\s+by|music\s+and\s+words\s+by|written\s+by|writers?\s*:|music\s+by|words\s+by)\s*:?\s*(.+)$/i;
const FIELD =
  /\b(title|key|tempo|bpm|time\s+signature|time|meter)\s*:\s*([^\s]+(?:\s+(?:major|minor))?)/gi;
const REPEAT = /^\(?\s*[x×]\s*(\d+)\s*\)?$/i;
const NO_CHORD = /^(?:n\.?c\.?|%|-|\/)$/i;

type LineKind = "blank" | "skip" | "field" | "writers" | "heading" | "chords" | "lyric";

interface SheetLine {
  text: string;
  kind: LineKind;
}

/** Each token of a chord line: a chord, a bar line, a repeat or a no-chord mark. */
function chordTokens(text: string): string[] | null {
  const tokens = text.split("|").join(" | ").trim().split(/\s+/).filter(Boolean);
  let chords = 0;
  for (const token of tokens) {
    if (token === "|" || REPEAT.test(token) || NO_CHORD.test(token)) continue;
    if (!readChord(token)) return null;
    chords++;
  }
  return chords > 0 ? tokens : null;
}

function classify(text: string): LineKind {
  if (text.trim() === "") return "blank";
  if (SKIP.test(text)) return "skip";
  if (WRITERS.test(text)) return "writers";
  if (HEADING.test(text)) return "heading";
  if (chordTokens(text)) return "chords";
  FIELD.lastIndex = 0;
  if (FIELD.test(text)) return "field";
  return "lyric";
}

/** "VERSE 1" is "Verse 1", "pre-chorus" is "Pre-Chorus", "[Verse]" is "Verse". */
function sectionName(match: RegExpExecArray): string {
  const word = (match[1] ?? "")
    .toLowerCase()
    .replace(/^pre[\s-]?chorus$/, "pre-chorus")
    .replace(/^pre[\s-]?coro$/, "precoro")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
  const number = (match[2] ?? "").trim();
  return number
    ? `${word} ${number.toUpperCase().length === 1 && /[a-z]/i.test(number) ? number.toUpperCase() : number}`
    : word;
}

/** The first words of a lyric line, as a landmark: no quotes, at most `count` words (R-10.7). */
function landmark(lyric: string, count: number): string {
  return lyric
    .replace(/["“”]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, Math.min(count, MAX_LANDMARK_WORDS))
    .join(" ")
    .replace(/[,;:.!?]+$/, "");
}

interface DraftRow {
  bars: string[];
  repeat: number | null;
  proposed: boolean;
}

interface DraftSection {
  name: string;
  repeat: number | null;
  rows: DraftRow[];
  landmark: string | null;
  firstChord: SheetChord | null;
}

/** A chord sheet as a ChartDown draft, with what to review (SPEC-10). */
export function importSheet(text: string, options: ImportOptions): ImportResult {
  const lines: SheetLine[] = text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n")
    .map((line) => ({ text: line.replace(/\s+$/, ""), kind: classify(line) }));
  const review: ReviewItem[] = [];
  const fields: Record<string, string> = {};
  let title: string | null = null;
  let writers: string | null = null;
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;
  let waitingLandmark = false;
  const chordsInOrder: SheetChord[] = [];

  for (const line of lines) {
    switch (line.kind) {
      case "blank":
      case "skip":
        break;
      case "writers":
        writers ??= (WRITERS.exec(line.text)?.[1] ?? "").trim() || null;
        break;
      case "field": {
        FIELD.lastIndex = 0;
        for (const match of line.text.matchAll(FIELD)) {
          const name = (match[1] ?? "").toLowerCase().replace(/\s+/g, " ");
          fields[name] ??= match[2] ?? "";
        }
        break;
      }
      case "heading": {
        const match = HEADING.exec(line.text);
        if (!match) break;
        current = {
          name: sectionName(match),
          repeat: match[3] ? Number(match[3]) : null,
          rows: [],
          landmark: null,
          firstChord: null,
        };
        sections.push(current);
        waitingLandmark = false;
        break;
      }
      case "chords": {
        if (!current) {
          // Chords before any heading: an intro the sheet didn't name.
          current = { name: "Intro", repeat: null, rows: [], landmark: null, firstChord: null };
          sections.push(current);
          review.push({ kind: "unmapped", section: "Intro", detail: "intro" });
        }
        const tokens = chordTokens(line.text) ?? [];
        const row = readRow(tokens);
        for (const chord of row.chords) chordsInOrder.push(chord);
        current.firstChord ??= row.chords[0] ?? null;
        current.rows.push({ bars: row.bars, repeat: row.repeat, proposed: row.proposed });
        if (current.rows.length === 1) waitingLandmark = true;
        break;
      }
      case "lyric":
        if (!current && sections.length === 0 && title === null) {
          title = line.text.trim();
          break;
        }
        if (current && waitingLandmark && current.landmark === null && options.landmarkWords > 0) {
          current.landmark = landmark(line.text, options.landmarkWords) || null;
        }
        waitingLandmark = false;
        break;
    }
  }
  title = (fields.title ?? title)?.trim() || null;

  // The key: as the sheet says it, or guessed from the first chord (R-10.2, R-10.5).
  const named = fields.key ? readKey(fields.key) : null;
  const first = chordsInOrder[0];
  const key: SheetKey = named ?? {
    tonic: first?.root ?? "C",
    minor: first ? first.quality.startsWith("m") && !first.quality.startsWith("maj") : false,
  };
  if (!named) review.push({ kind: "key-guessed", detail: keyText(key) });
  if (sections.length === 0) review.push({ kind: "no-sections" });

  // The draft, in ChartDown.
  const out: string[] = ["---"];
  if (title) out.push(`title: ${title}`);
  out.push(`key: ${keyText(key)}`);
  const tempo = Number.parseInt(fields.tempo ?? fields.bpm ?? "", 10);
  if (tempo > 0) out.push(`tempo: ${tempo}`);
  const meter = fields["time signature"] ?? fields.time ?? fields.meter;
  if (meter && /^\d{1,2}\/\d{1,2}$/.test(meter)) out.push(`meter: ${meter}`);
  out.push("---");
  for (const section of sections) {
    out.push(`## ${section.name}`);
    if (section.repeat) {
      out.push(`// Played x${section.repeat} in the sheet.`);
      review.push({
        kind: "unmapped",
        line: out.length,
        section: section.name,
        detail: `x${section.repeat}`,
      });
    }
    section.rows.forEach((row, index) => {
      const bars = row.bars.map((bar) =>
        bar
          .split(" ")
          .map((token) => {
            const chord = readChord(token);
            return chord ? writeChord(chord, key, options.style) : token;
          })
          .join(" "),
      );
      if (index === 0 && section.landmark && bars.length > 0)
        bars[0] = `${bars[0]} "${section.landmark}"`;
      const body = bars.join(" | ");
      out.push(row.repeat ? `|: ${body} :| x${row.repeat}` : body);
      if (row.proposed)
        review.push({ kind: "bars-proposed", line: out.length, section: section.name });
    });
  }
  const source = `${out.join("\n")}\n`;

  // What the parser itself warns about: an unknown chord, an odd bar.
  for (const warning of parse(source).warnings)
    review.push({
      kind: warning.code === "bad-token" ? "unknown-chord" : "chart-warning",
      line: warning.line,
      detail: warning.message,
    });

  return { source, title, writers, key: keyText(key), review, sections: sections.length };
}

/** A chord line's bars: kept as written when it has bar lines, one chord a bar otherwise (R-10.6). */
function readRow(tokens: string[]): {
  bars: string[];
  repeat: number | null;
  proposed: boolean;
  chords: SheetChord[];
} {
  const chords = tokens.map((token) => readChord(token)).filter((chord) => chord !== null);
  const repeatToken = tokens.find((token) => REPEAT.test(token));
  const repeat = repeatToken ? Number(REPEAT.exec(repeatToken)?.[1]) : null;
  const items = tokens.filter((token) => !REPEAT.test(token));
  if (items.includes("|")) {
    const bars = items
      .join(" ")
      .split("|")
      .map((bar) => bar.trim().split(/\s+/).filter(Boolean).join(" "))
      .filter((bar) => bar !== "");
    return { bars, repeat, proposed: false, chords };
  }
  return { bars: items.filter((token) => !NO_CHORD.test(token)), repeat, proposed: true, chords };
}
