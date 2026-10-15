// Chord names as chord sheets write them, read and turned into ChartDown (SPEC-10, T-1404,
// T-1405): a root, an optional quality and an optional slash bass, written as numbers relative
// to the key (tonic-based in a minor key) or kept as letters.

export interface SheetChord {
  /** The root's letter and accidental, as written: "C#", "Bb". */
  root: string;
  /** The quality in ChartDown's spelling: "", "m", "7", "maj7", "m7b5", "sus4"… */
  quality: string;
  /** The slash bass's letter and accidental, if any. */
  bass: string | null;
}

export interface SheetKey {
  tonic: string;
  minor: boolean;
}

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// Every interval from the tonic as a scale degree; minor keys count from their own tonic, so the
// flat third, sixth and seventh read b3, b6 and b7 (R-10.5).
const DEGREES = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];

const NOTE = /^([A-G])([#b♯♭]?)/;
const QUALITY_PART =
  /^(?:maj|min|mi|m|M|Δ|dim|°|ø|aug|\+|-|sus|add|no|alt|\d{1,2}|[#b♯♭]\d{1,2}|\(|\))/;

/** The quality as ChartDown writes it, or null when it is not a chord quality. */
function normalizeQuality(raw: string): string | null {
  let rest = raw;
  while (rest !== "") {
    const part = QUALITY_PART.exec(rest);
    if (!part) return null;
    rest = rest.slice(part[0].length);
  }
  const quality = raw
    .replace(/[()]/g, "")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/^(?:ø7?|m7b5|min7b5|-7b5)/, "m7b5")
    .replace(/^(?:Δ7?|M7|maj7)/, "maj7")
    .replace(/^(?:°7|dim7)/, "dim7")
    .replace(/^(?:°|dim)/, "dim")
    .replace(/^(?:\+|aug)/, "aug")
    .replace(/^(?:min|mi|-)(?!\d*b5)/, "m");
  return quality;
}

/** A chord name read from a sheet, or null when the token is not a chord. */
export function readChord(token: string): SheetChord | null {
  const [main = "", bassText, extra] = token.split("/");
  if (extra !== undefined) return null;
  const root = NOTE.exec(main);
  if (!root) return null;
  const quality = normalizeQuality(main.slice(root[0].length));
  if (quality === null) return null;
  let bass: string | null = null;
  if (bassText !== undefined) {
    const note = NOTE.exec(bassText);
    if (!note || note[0].length !== bassText.length) return null;
    bass = spell(note[1] ?? "", note[2] ?? "");
  }
  return { root: spell(root[1] ?? "", root[2] ?? ""), quality, bass };
}

function spell(letter: string, accidental: string): string {
  return letter + accidental.replace("♯", "#").replace("♭", "b");
}

function semitone(note: string): number {
  const base = LETTERS[note[0] ?? "C"] ?? 0;
  const shift = note.includes("#") ? 1 : note.includes("b") ? -1 : 0;
  return (base + shift + 12) % 12;
}

/** A note as a scale degree of the key: "G#" in E is "3". */
export function degree(note: string, key: SheetKey): string {
  return DEGREES[(semitone(note) - semitone(key.tonic) + 12) % 12] ?? "1";
}

/** A chord as ChartDown writes it: in numbers relative to the key, or in letters as read. */
export function writeChord(chord: SheetChord, key: SheetKey, style: "numbers" | "letters"): string {
  const root = style === "numbers" ? degree(chord.root, key) : chord.root;
  const bass = chord.bass ? `/${style === "numbers" ? degree(chord.bass, key) : chord.bass}` : "";
  return `${root}${chord.quality}${bass}`;
}

/** The key a sheet names, "E", "Em", "F# minor", "Bb major", or null when it can't be read. */
export function readKey(text: string): SheetKey | null {
  const match = /^([A-G])([#b♯♭]?)\s*(m(?!aj)|min(?:or)?|maj(?:or)?)?$/i.exec(text.trim());
  if (!match) return null;
  const quality = (match[3] ?? "").toLowerCase();
  return {
    tonic: spell((match[1] ?? "C").toUpperCase(), match[2] ?? ""),
    minor: quality.startsWith("m") && !quality.startsWith("maj"),
  };
}

/** The key's name as ChartDown's header writes it: "E", "Em". */
export function keyText(key: SheetKey): string {
  return `${key.tonic}${key.minor ? "m" : ""}`;
}
