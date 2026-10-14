import { layoutBeats } from "./beats.js";
import { degree } from "./display.js";
import { playOrder, type PlayStep } from "./navigation.js";
import type { Bar, BarItem, Chart, Cue, Key, Numbering, Row, Section } from "./types.js";

export interface RiffNoteJson {
  rest?: true;
  root?: string;
  degree?: number;
  beats: number;
}

export type ItemJson =
  | {
      type: "chord";
      root: string;
      degree: number;
      quality: string;
      bass: string | null;
      bassDegree: number | null;
      beats: number;
      /** 0 none, 1 eighth (`'`), 2 sixteenth (`''`). */
      push: 0 | 1 | 2;
      hold: boolean;
      stab: boolean;
      fermata: boolean;
    }
  | { type: "rest"; beats: number }
  | { type: "riff"; beats: number; notes: RiffNoteJson[] }
  | { type: "repeat" }
  | { type: "tie" };

export interface CueJson {
  roles: string[];
  passes: number[];
  text: string;
}

export interface BarJson {
  number: number;
  beats: number;
  pickup: boolean;
  meter: string | null;
  repeatStart: boolean;
  repeatEnd: boolean;
  times: number | null;
  ending: number[] | null;
  dynamic: string | null;
  tempoMark: string | null;
  nav: string[];
  cues: CueJson[];
  lyric: string | null;
  items: ItemJson[];
}

export interface RowJson {
  key: string;
  /** Whether the row is in a minor key (ChartDown 0.7). */
  minor: boolean;
  meter: string;
  tempo: number | null;
  bars: BarJson[];
}

export interface SectionJson {
  name: string;
  use: string | null;
  notes: { md: boolean; roles: string[]; passes: number[]; text: string }[];
  rows: RowJson[];
}

/** The JSON form of a parsed chart, ChartDown spec Appendix A (R-00.10). */
export interface ChartJson {
  chartdown: string | null;
  meta: Record<string, string>;
  key: string;
  minor: boolean;
  /** How numbers count in a minor key (ChartDown 0.7, spec 3). */
  numbering: Numbering;
  sections: SectionJson[];
  playOrder: Pick<PlayStep, "section" | "bar" | "pass">[];
  warnings: { line: number; code: string; message: string }[];
}

const meterText = (meter: { beats: number; unit: number }) => `${meter.beats}/${meter.unit}`;

function itemJson(item: BarItem, share: number, key: Key, numbering: Numbering): ItemJson {
  switch (item.type) {
    case "repeat-bar":
      return { type: "repeat" };
    case "tie":
      return { type: "tie" };
    case "no-chord":
      return { type: "rest", beats: share };
    case "riff": {
      const { shares } = layoutBeats(item.notes, share);
      return {
        type: "riff",
        beats: share,
        notes: item.notes.map((note, index) =>
          note.type === "rest"
            ? { rest: true, beats: shares[index] as number }
            : {
                root: note.root,
                degree: degree(note.root, key, numbering),
                beats: shares[index] as number,
              },
        ),
      };
    }
    case "chord":
      return {
        type: "chord",
        root: item.root,
        degree: degree(item.root, key, numbering),
        quality: item.quality,
        bass: item.bass ?? null,
        bassDegree: item.bass === undefined ? null : degree(item.bass, key, numbering),
        beats: share,
        push: item.push ? (item.shortPush ? 2 : 1) : 0,
        hold: item.hold,
        stab: item.stab,
        fermata: item.fermata,
      };
  }
}

function barJson(bar: Bar, row: Row, numbering: Numbering): BarJson {
  const total = bar.pickup ?? bar.meter?.beats ?? row.meter.beats;
  const timed = bar.items.flatMap((item) =>
    item.type === "chord" || item.type === "no-chord" || item.type === "riff" ? [item] : [],
  );
  const { shares } = layoutBeats(timed, total);
  let next = 0;
  const cue = (c: Cue): CueJson => ({ roles: c.roles, passes: c.passes, text: c.text });
  return {
    number: bar.number,
    beats: total,
    pickup: bar.pickup !== undefined,
    meter: bar.meter ? meterText(bar.meter) : null,
    repeatStart: bar.repeatStart === true,
    repeatEnd: bar.repeatEnd !== undefined,
    times: bar.repeatEnd?.times ?? null,
    ending: bar.ending ?? null,
    dynamic: bar.dynamic ?? null,
    tempoMark: bar.tempoMark ?? null,
    nav: bar.nav ?? [],
    cues: bar.cues.map(cue),
    lyric: bar.lyric ?? null,
    items: bar.items.map((item) =>
      itemJson(
        item,
        item.type === "chord" || item.type === "no-chord" || item.type === "riff"
          ? (shares[next++] as number)
          : 0,
        row.key,
        numbering,
      ),
    ),
  };
}

function sectionJson(section: Section, numbering: Numbering): SectionJson {
  return {
    name: section.name,
    use: section.use?.name ?? null,
    notes: section.notes.map((note) => ({
      md: note.md,
      roles: note.roles,
      passes: note.passes,
      text: note.text,
    })),
    rows: section.rows.map((row) => ({
      key: row.key.root,
      minor: row.key.minor,
      meter: meterText(row.meter),
      tempo: row.tempo ?? null,
      bars: row.bars.map((bar) => barJson(bar, row, numbering)),
    })),
  };
}

/**
 * The chart in the JSON form of ChartDown spec Appendix A, so apps, converters and tests agree
 * on what a chart means (R-00.10). Roles are the instrument ids of the catalog the chart was
 * parsed with, `everyone` for the whole band. Producers may add fields: `warnings[].code` is one.
 */
export function toJSON(chart: Chart): ChartJson {
  return {
    chartdown: chart.version ?? null,
    meta: chart.header,
    key: chart.key.root,
    minor: chart.key.minor,
    numbering: chart.numbering,
    sections: chart.sections.map((section) => sectionJson(section, chart.numbering)),
    // Appendix A has three fields per step; `jump` is for renderers.
    playOrder: playOrder(chart).map(({ section, bar, pass }) => ({ section, bar, pass })),
    warnings: chart.warnings.map(({ line, code, message }) => ({ line, code, message })),
  };
}
