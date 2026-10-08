/** An instrument role: a standard role (see STANDARD_ROLES), a custom id from the header, or "everyone". */
export type Role = string;

/** An instrument of the catalog: its id (the Admin's slug) and the names a chart may use for it. */
export interface Instrument {
  id: string;
  names: string[];
}

export interface ParseOptions {
  /**
   * The Admin's instrument catalog (R-00.1). Replaces the spec's standard roles when given.
   * Include deactivated instruments so older charts still resolve (R-07.3).
   */
  instruments?: readonly Instrument[];
}

export interface Key {
  /** Letter root, for example "G", "Bb" or "F#". */
  root: string;
  minor: boolean;
}

export interface Meter {
  /** Top number: the beats a bar has, in the meter's own units. */
  beats: number;
  unit: number;
}

export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff" | "cresc" | "decresc";

/** Tempo marks, reserved words in `{ }` (spec 9): `{rit}`, `{accel}` and `{a tempo}`. */
export type TempoMark = "rit" | "accel" | "atempo";

/** Navigation marks, reserved words in `{ }` (spec 10.1), normalized as in the JSON form. */
export type NavMark =
  | "segno"
  | "coda"
  | "tocoda"
  | "fine"
  | "ds"
  | "dsalcoda"
  | "dsalfine"
  | "dc"
  | "dcalcoda"
  | "dcalfine";

export interface Chord {
  type: "chord";
  /** As written: a number ("1", "b7", "#4") or a letter ("G", "Bb"). */
  root: string;
  /** As written after the root, with a leading "-" normalized to "m". "" is major. */
  quality: string;
  bass?: string;
  /** Share of the bar: the explicit `:beats`, or 1 when chords share the bar evenly. */
  beats: number;
  explicitBeats: boolean;
  /** Played early: an eighth note ahead (`'`), or a sixteenth when `shortPush` is set (`''`). */
  push: boolean;
  /** The push is a sixteenth note (`''`, spec 8); `push` is set too. */
  shortPush?: true;
  hold: boolean;
  stab: boolean;
  fermata: boolean;
}

/** One note of a unison riff (spec 7.1): a root as in spec 6, or a rest. */
export type RiffNote =
  | { type: "note"; root: string; beats: number; explicitBeats: boolean }
  | { type: "rest"; beats: number; explicitBeats: boolean };

/** `R[ ... ]`: a line the band plays in unison, as single notes (spec 7.1). */
export interface Riff {
  type: "riff";
  notes: RiffNote[];
  /** Share of the bar, as for a chord. */
  beats: number;
  explicitBeats: boolean;
}

/** N.C. for a full bar (`x`), or for part of it (`x:beats`, spec 5.1). */
export interface NoChord {
  type: "no-chord";
  /** Share of the bar: the explicit `:beats`, or 1 when tokens share the bar evenly. */
  beats?: number;
  explicitBeats?: boolean;
}

export type BarItem = Chord | NoChord | Riff | { type: "repeat-bar" } | { type: "tie" };

export interface Cue {
  roles: Role[];
  /** The passes of a repeat it is for (spec 9.1); empty for every pass. */
  passes: number[];
  text: string;
}

export interface Bar {
  /** Bar number in its section: 0 for a pickup, then 1, 2, ... (spec 5.3). */
  number: number;
  items: BarItem[];
  /** A pickup: an incomplete bar of this many beats that leads into the first full bar (spec 5.3). */
  pickup?: number;
  /** The meter of this one bar, from `[m:N/D]` (spec 11.2). */
  meter?: Meter;
  dynamic?: Dynamic;
  tempoMark?: TempoMark;
  /** Navigation marks on the bar (spec 10.1). */
  nav?: NavMark[];
  cues: Cue[];
  /** Lyric landmark; several in one bar are joined with " / ". */
  lyric?: string;
  /** Passes this bar is played on, for example [1] or [1, 2]. */
  ending?: number[];
  repeatStart?: true;
  repeatEnd?: { times: number };
}

export interface Row {
  line: number;
  /** The key in effect for this row. */
  key: Key;
  /** The meter in effect for this row (spec 11.2). */
  meter: Meter;
  /** The tempo in effect for this row, in beats per minute (spec 11.3). */
  tempo?: number;
  /** Set on the first row after an `@key` line. */
  keyChange?: Key;
  /** Set on the first row after an `@meter` line. */
  meterChange?: Meter;
  /** Set on the first row after an `@tempo` line. */
  tempoChange?: number;
  bars: Bar[];
}

export interface Note {
  md: boolean;
  roles: Role[];
  /** The passes of the section's repeat it is for (spec 9.1); empty for every pass. */
  passes: number[];
  text: string;
  line: number;
}

export interface Section {
  name: string;
  line: number;
  notes: Note[];
  rows: Row[];
  /** The `@use` line, when the section reuses an earlier section's rows. */
  use?: { name: string; line: number };
}

export type WarningCode =
  | "header-line"
  | "instrument-id"
  | "unknown-instrument"
  | "no-section"
  | "unknown-directive"
  | "use-not-found"
  | "bad-token"
  | "empty-bar"
  | "beats-mismatch"
  | "landmark-too-long"
  | "unsupported-version"
  | "header-not-closed"
  | "use-with-rows"
  | "unknown-cue-instrument"
  | "layer-no-section"
  | "layer-line"
  | "bad-bar-heading"
  | "bad-meter-directive"
  | "bad-tempo-directive"
  | "pickup-and-meter"
  | "pickup-length"
  | "pickup-not-first"
  | "pickup-beats-mismatch"
  | "riff-note"
  | "riff-beats-mismatch"
  | "pass-without-repeat"
  | "note-pass-without-repeat"
  | "nav-duplicate"
  | "nav-second-jump"
  | "nav-needs-segno"
  | "nav-needs-coda"
  | "nav-needs-fine";

export interface Warning {
  line: number;
  code: WarningCode;
  /** English message. The app translates by `code` and `values`. */
  message: string;
  values?: Record<string, string | number>;
}

export interface Chart {
  /** The declared format version, from the `chartdown` header (R-00.4). */
  version?: string;
  /** Every header field, names lowercased, values as written. */
  header: Record<string, string>;
  key: Key;
  meter: Meter;
  /** The tempo at the start, in beats per minute (spec 3). */
  tempo?: number;
  /** Custom instrument ids declared in the `instruments` header. */
  instruments: string[];
  sections: Section[];
  warnings: Warning[];
}

/** An MD note of a layer, anchored to a section by name and occurrence and optionally to a bar (R-00.2). */
export interface LayerNote {
  /** The app's id for the note, carried through unchanged. */
  id?: string;
  /** The revision the note was anchored to; lets placement notice shifted occurrences. */
  revision?: string;
  section: string;
  /** 1 for the first section with this name in the chart, 2 for the second, and so on. */
  occurrence: number;
  /** Bar of the section, counted from 1 across its rows. */
  bar?: number;
  roles: Role[];
  /** The passes of a repeat the note is for (spec 9.1); omitted for every pass. */
  passes?: number[];
  text: string;
}

export interface Layer {
  title?: string;
  notes: LayerNote[];
}

export interface ParsedLayer {
  layer: Layer;
  header: Record<string, string>;
  version?: string;
  instruments: string[];
  warnings: Warning[];
}

export interface PlacedNote {
  note: LayerNote;
  bar?: number;
}

/** Why a note could not be placed: its section or its bar is not in the chart. */
export type UnplacedReason = "section" | "bar";

export interface UnplacedNote {
  note: LayerNote;
  reason: UnplacedReason;
}

export interface PlaceOptions {
  /**
   * The chart at the revision a note was anchored to. When it is known, a note is placed
   * only if the chart still has as many sections with the note's name as that revision.
   */
  anchoredChart?: (revision: string) => Chart | undefined;
}

export interface Placement {
  /** The notes on each section of the chart, in the chart's section order. */
  sections: PlacedNote[][];
  /** Notes whose anchor is not in the chart, unchanged so they are never lost. */
  unplaced: UnplacedNote[];
}
