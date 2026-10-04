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
  "landmark-too-long": () => "Lyric landmarks should be 8 words or fewer",
  "unsupported-version": (v) =>
    `This chart says ChartDown ${v.version}; this parser reads ${v.supported}`,
  "header-not-closed": () => "The header needs a closing --- line",
  "use-with-rows": () => "@use must be the only content line of a section; its own rows are kept",
};

export type Warn = (line: number, code: WarningCode, values?: Values) => void;

export function createWarning(line: number, code: WarningCode, values?: Values): Warning {
  const warning: Warning = { line, code, message: MESSAGES[code](values ?? {}) };
  if (values !== undefined) warning.values = values;
  return warning;
}
