import type { Warning, WarningCode } from "./types.js";

type Values = Record<string, string | number>;

const MESSAGES: Record<WarningCode, (values: Values) => string> = {
  "header-line": () => "Header lines look like  name: value",
  "instrument-id": (v) => `Instrument ids use lowercase letters, digits and -: “${v.id}”`,
  "unknown-instrument": (v) => `Unknown instrument “${v.name}” in an MD note`,
  "unknown-cue-instrument": (v) => `Unknown instrument “${v.name}” in a cue`,
  "layer-no-section": () => "Notes need a section first, like  ## Chorus",
  "layer-line": () => "A layer holds only sections, bar headings and notes",
  "bad-bar-heading": () => "Bar headings look like  ### Bar 3",
  "no-section": () => "Bars need a section first, like  ## Verse 1",
  "unknown-directive": (v) => `Unknown directive “${v.directive}”`,
  "use-not-found": (v) => `Can’t find an earlier section named “${v.name}”`,
  "bad-token": (v) => `Can’t read “${v.token}”`,
  "empty-bar": () => "This bar has no chords",
  "beats-mismatch": (v) => `Beats add up to ${v.sum}, but the meter has ${v.beats}`,
  "landmark-too-long": (v) =>
    `This lyric landmark has ${v.words} words; keep it to ${v.max} or fewer`,
  "unsupported-version": (v) =>
    `This chart says ChartDown ${v.version}; this parser reads ${v.supported}`,
  "header-not-closed": () => "The header needs a closing --- line",
  "use-with-rows": () => "@use must be the only content line of a section; its own rows are kept",
  "bad-meter-directive": () => "Write a meter change like  @meter 3/4",
  "bad-tempo-directive": () => "Write a tempo change like  @tempo 96",
  "pickup-and-meter": () => "A bar can\u2019t have both a pickup and a one-bar meter",
  "pickup-length": (v) => `A pickup needs more than 0 and fewer than ${v.beats} beats`,
  "pickup-not-first": () => "A pickup must be the first bar of a section",
  "pickup-beats-mismatch": (v) => `Beats add up to ${v.sum}, but the pickup has ${v.beats}`,
  "riff-note": (v) =>
    `Can\u2019t read \u201c${v.token}\u201d in a riff (notes are scale degrees or letters)`,
  "riff-beats-mismatch": (v) =>
    `Riff beats add up to ${v.sum}, but its space in the bar is ${v.beats}`,
  "pass-without-repeat": () => "A cue for one pass (like 2x) needs a repeat",
  "note-pass-without-repeat": () =>
    "An MD note for one pass (like 2x) needs a repeat in its section",
  "nav-duplicate": (v) => `There is more than one {${v.mark}}`,
  "nav-second-jump": () => "A song can have only one D.S. or D.C. jump",
  "nav-needs-segno": () => "D.S. needs a {segno}",
  "nav-needs-coda": (v) => `${v.mark} needs a {to coda} and a {coda}`,
  "nav-needs-fine": (v) => `${v.mark} needs a {fine}`,
};

export type Warn = (line: number, code: WarningCode, values?: Values) => void;

export function createWarning(line: number, code: WarningCode, values?: Values): Warning {
  const warning: Warning = { line, code, message: MESSAGES[code](values ?? {}) };
  if (values !== undefined) warning.values = values;
  return warning;
}

/** Every warning code, so the app can check it has a translated message for each. */
export const WARNING_CODES = Object.keys(MESSAGES) as WarningCode[];
