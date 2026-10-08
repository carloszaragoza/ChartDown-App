import type { BarItem, Chord, Riff, RiffNote } from "./types.js";
import type { WarningCode } from "./types.js";

const ROOT = "[b#]?[1-7]|[A-G][b#]?";
const CHORD = new RegExp(`^(${ROOT})([^/]*)(?:/(${ROOT}))?$`);
const ROOT_ONLY = new RegExp(`^(?:${ROOT})$`);
const BEATS = /(\d+(?:\.\d+)?)/;

/**
 * Reads one token of a bar (spec 6 to 8): `x` or `x:beats`, `%`, `=`, or a chord with its
 * marks, in the order `'` or `''` · `<` `>` · chord · `:beats` · `!` `~`. A riff, `R[ ... ]`,
 * is read by `parseRiff`. Returns undefined if unreadable.
 */
export function parseToken(token: string): BarItem | undefined {
  if (token === "%") return { type: "repeat-bar" };
  if (token === "=") return { type: "tie" };
  const rest = new RegExp(`^[xX](?::${BEATS.source})?$`).exec(token);
  if (rest) {
    const written = rest[1];
    // A plain `x` shares the bar like any token; only `x:beats` carries its beats.
    return written === undefined
      ? { type: "no-chord" }
      : { type: "no-chord", beats: Number.parseFloat(written), explicitBeats: true };
  }

  let text = token;
  let stab = false;
  let fermata = false;
  while (/[!~]$/.test(text)) {
    if (text.endsWith("!")) stab = true;
    else fermata = true;
    text = text.slice(0, -1);
  }

  let beats = 1;
  let explicitBeats = false;
  const beatsMatch = new RegExp(`:${BEATS.source}$`).exec(text);
  if (beatsMatch) {
    beats = Number.parseFloat(beatsMatch[1] as string);
    explicitBeats = true;
    text = text.slice(0, beatsMatch.index);
  }

  let shortPush = false;
  const push = text.startsWith("'");
  if (text.startsWith("''")) {
    shortPush = true;
    text = text.slice(2);
  } else if (push) text = text.slice(1);
  const hold = text.startsWith("<") && text.endsWith(">");
  if (hold) text = text.slice(1, -1);

  const match = CHORD.exec(text);
  if (!match) return undefined;
  const [, root, written = "", bass] = match;
  const quality = written.startsWith("-") ? `m${written.slice(1)}` : written;

  const chord: Chord = {
    type: "chord",
    root: root as string,
    quality,
    beats,
    explicitBeats,
    push,
    hold,
    stab,
    fermata,
  };
  if (shortPush) chord.shortPush = true;
  if (bass !== undefined) chord.bass = bass;
  return chord;
}

/**
 * `R[ notes ]` with optional `:beats` after the bracket (spec 7.1). Each note is a root with no
 * quality or bass, optionally with `:beats`, or `x` for a rest. A note it cannot read is a
 * warning and is skipped; a riff with no readable note is not a riff.
 */
export function parseRiff(
  token: string,
  warn: (code: WarningCode, values?: Record<string, string | number>) => void,
): Riff | undefined {
  const match = new RegExp(`^R\\[([^\\]]*)\\](?::${BEATS.source})?$`).exec(token);
  if (!match) return undefined;
  const notes: RiffNote[] = [];
  for (const word of (match[1] as string).trim().split(/\s+/).filter(Boolean)) {
    const part = new RegExp(`^(.+?)(?::${BEATS.source})?$`).exec(word);
    const body = part?.[1] as string;
    const written = part?.[2];
    const base = {
      beats: written === undefined ? 1 : Number.parseFloat(written),
      explicitBeats: written !== undefined,
    };
    if (body === "x" || body === "X") notes.push({ type: "rest", ...base });
    else if (ROOT_ONLY.test(body)) notes.push({ type: "note", root: body, ...base });
    else warn("riff-note", { token: word });
  }
  if (notes.length === 0) return undefined;
  const written = match[2];
  return {
    type: "riff",
    notes,
    beats: written === undefined ? 1 : Number.parseFloat(written),
    explicitBeats: written !== undefined,
  };
}
