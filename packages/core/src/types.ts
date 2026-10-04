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
  push: boolean;
  hold: boolean;
  stab: boolean;
  fermata: boolean;
}

export type BarItem = Chord | { type: "no-chord" } | { type: "repeat-bar" } | { type: "tie" };

export interface Cue {
  roles: Role[];
  text: string;
}

export interface Bar {
  items: BarItem[];
  dynamic?: Dynamic;
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
  /** Set on the first row after an `@key` line. */
  keyChange?: Key;
  bars: Bar[];
}

export interface Note {
  md: boolean;
  roles: Role[];
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
  | "unknown-cue-instrument";

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
  /** Custom instrument ids declared in the `instruments` header. */
  instruments: string[];
  sections: Section[];
  warnings: Warning[];
}
