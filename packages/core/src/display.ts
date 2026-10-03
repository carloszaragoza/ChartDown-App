import type { Chart, Chord, Key, Row } from "./types.js";

export type ChordStyle = "numbers" | "letters";

export interface DisplayOptions {
  style: ChordStyle;
  /** Home key to show the chart in. Defaults to the written key; the chart's mode (major or minor) is kept. */
  key?: Key;
}

export interface ChordLabel {
  root: string;
  quality: string;
  bass?: string;
  /** The whole chord as a musician reads it, for example "F#m" or "6-/1". */
  text: string;
}

export interface ChordFormatter {
  homeKey: Key;
  /** The key a row is shown in: key changes move with the transposition (spec 12.2). */
  rowKey(row: Row): Key;
  chord(chord: Chord, row: Row): ChordLabel;
}

// Degree to semitone in the major scale (spec 12). In a minor key, 1 is the tonic (spec 3).
const SCALE = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = "CDEFGAB";
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const NUMBERS = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];
// Spec 12.4: flat spellings in these keys, sharps otherwise.
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);
// Common names for transposed keys (SPEC-00 interpretations).
const MAJOR_KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const accidental = (sign: string | undefined) => (sign === "#" ? 1 : sign === "b" ? -1 : 0);
const isNumberRoot = (root: string) => /^[b#]?[1-7]$/.test(root);

function letterSemitone(letter: string): number {
  return mod12((LETTER_SEMITONES[letter.charAt(0)] ?? 0) + accidental(letter.charAt(1)));
}

/** Semitones from the key's tonic to a root written as a number or a letter (spec 12.1). */
function degree(root: string, key: Key): number {
  const number = /^([b#]?)([1-7])$/.exec(root);
  if (number) return mod12((SCALE[Number(number[2]) - 1] as number) + accidental(number[1]));
  return mod12(letterSemitone(root) - letterSemitone(key.root));
}

/** The relative major of a minor key, spelled by letter: Dm → F, Ebm → Gb. */
function relativeMajor(key: Key): string {
  const letter = LETTERS[(LETTERS.indexOf(key.root.charAt(0)) + 2) % 7] as string;
  const offset = mod12(letterSemitone(key.root) + 3 - letterSemitone(letter));
  return letter + (offset === 1 ? "#" : offset === 11 ? "b" : "");
}

/** Spec 12.4, with minor keys spelled like their relative major (SPEC-00 interpretations). */
function usesFlats(key: Key): boolean {
  return FLAT_KEYS.has(key.minor ? relativeMajor(key) : key.root);
}

/** Number style shows minor as "-": "m" → "-", "m7" → "-7"; "maj7" is unchanged (spec 12.3). */
function numberQuality(quality: string): string {
  return quality.startsWith("m") && !quality.startsWith("maj") ? `-${quality.slice(1)}` : quality;
}

export function keyName(key: Key): string {
  return key.root + (key.minor ? "m" : "");
}

/** Reads a key name such as "G", "Bb" or "F#m". */
export function parseKeyName(name: string): Key | undefined {
  const match = /^([A-G][b#]?)(m?)$/.exec(name.trim());
  return match ? { root: match[1] as string, minor: match[2] === "m" } : undefined;
}

export function semitonesBetween(from: Key, to: Key): number {
  return mod12(letterSemitone(to.root) - letterSemitone(from.root));
}

/** Moves a key by semitones and gives it its common name, keeping its mode. */
export function transposeKey(key: Key, semitones: number): Key {
  const names = key.minor ? MINOR_KEYS : MAJOR_KEYS;
  return { root: names[mod12(letterSemitone(key.root) + semitones)] as string, minor: key.minor };
}

/** Shows a chart's chords as numbers or letters, optionally transposed. The chart is not changed. */
export function chordFormatter(chart: Chart, options: DisplayOptions): ChordFormatter {
  const homeKey: Key = { root: options.key?.root ?? chart.key.root, minor: chart.key.minor };
  const transposed = homeKey.root !== chart.key.root;
  const shift = semitonesBetween(chart.key, homeKey);

  const rowKey = (row: Row): Key => {
    if (!transposed) return row.key;
    const isHome = row.key.minor === chart.key.minor && semitonesBetween(chart.key, row.key) === 0;
    return isHome ? homeKey : transposeKey(row.key, shift);
  };

  const formatRoot = (root: string, written: Key, shown: Key): string => {
    if (options.style === "numbers")
      return isNumberRoot(root) ? root : (NUMBERS[degree(root, written)] as string);
    if (!isNumberRoot(root) && !transposed) return root;
    const names = usesFlats(shown) ? FLATS : SHARPS;
    return names[mod12(letterSemitone(shown.root) + degree(root, written))] as string;
  };

  return {
    homeKey,
    rowKey,
    chord(chord, row) {
      const shown = rowKey(row);
      const root = formatRoot(chord.root, row.key, shown);
      const quality = options.style === "numbers" ? numberQuality(chord.quality) : chord.quality;
      const label: ChordLabel = { root, quality, text: root + quality };
      if (chord.bass !== undefined) {
        label.bass = formatRoot(chord.bass, row.key, shown);
        label.text += `/${label.bass}`;
      }
      return label;
    },
  };
}
