import type { BarItem, Chord } from "./types.js";

const CHORD = /^([b#]?[1-7]|[A-G][b#]?)([^/]*)(?:\/([b#]?[1-7]|[A-G][b#]?))?$/;

/**
 * Reads one token of a bar (spec 6 to 8): `x`, `%`, `=`, or a chord with its marks,
 * in the order `'` · `<` `>` · chord · `:beats` · `!` `~`. Returns undefined if unreadable.
 */
export function parseToken(token: string): BarItem | undefined {
  if (token === "%") return { type: "repeat-bar" };
  if (token === "=") return { type: "tie" };
  if (token === "x" || token === "X") return { type: "no-chord" };

  let rest = token;
  let stab = false;
  let fermata = false;
  while (/[!~]$/.test(rest)) {
    if (rest.endsWith("!")) stab = true;
    else fermata = true;
    rest = rest.slice(0, -1);
  }

  let beats = 1;
  let explicitBeats = false;
  const beatsMatch = /:(\d+(?:\.\d+)?)$/.exec(rest);
  if (beatsMatch) {
    beats = Number.parseFloat(beatsMatch[1] as string);
    explicitBeats = true;
    rest = rest.slice(0, beatsMatch.index);
  }

  const push = rest.startsWith("'");
  if (push) rest = rest.slice(1);
  const hold = rest.startsWith("<") && rest.endsWith(">");
  if (hold) rest = rest.slice(1, -1);

  const match = CHORD.exec(rest);
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
  if (bass !== undefined) chord.bass = bass;
  return chord;
}
