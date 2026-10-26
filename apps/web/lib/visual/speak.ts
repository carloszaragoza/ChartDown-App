// A bar read in full words (R-13.13): "six minor", never "6m".
import { tokens } from "./model";

/** The words a screen reader says for a chord's parts, in the interface language. */
export interface ChordWords {
  degree: (degree: string) => string;
  quality: (quality: string) => string | undefined;
  over: (bass: string) => string;
  push: string;
  rest: string;
  repeat: string;
}

const CHORD =
  /^('{0,2})<?([b#]?[1-7]|[A-G][b#]?)([^/>!~:]*)(?:\/([b#]?[1-7]|[A-G][b#]?))?>?(?::[\d.]+)?[!~]*$/;

/** One token in words: "five suspended", "four over five". */
export function speakToken(token: string, words: ChordWords): string {
  if (token === "x" || token.startsWith("x:")) return words.rest;
  if (token === "%") return words.repeat;
  const match = CHORD.exec(token);
  if (!match) return token;
  const [, push = "", root = "", quality = "", bass] = match;
  return [
    push ? words.push : "",
    words.degree(root),
    quality ? (words.quality(quality) ?? quality.split("").join(" ")) : "",
    bass ? words.over(words.degree(bass)) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** A bar's chords in words, joined. */
export const speakChords = (chords: string, words: ChordWords) =>
  tokens(chords)
    .map((token) => speakToken(token, words))
    .join(", ");
