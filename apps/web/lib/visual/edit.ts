// The visual editor's changes (SPEC-13, T-3002): each one returns a new chart, so undo and redo
// keep the charts before it (R-13.11).
import {
  emptyBar,
  emptySection,
  rowGroups,
  tokens,
  type VisualBar,
  type VisualChart,
  type VisualNote,
  type VisualSection,
} from "./model";

/** A bar by its section and place in it. */
export interface BarAt {
  section: number;
  bar: number;
}

const withSection = (
  chart: VisualChart,
  index: number,
  change: (section: VisualSection) => VisualSection,
): VisualChart => ({
  ...chart,
  sections: chart.sections.map((section, at) => (at === index ? change(section) : section)),
});

export const setBar = (chart: VisualChart, at: BarAt, change: Partial<VisualBar>): VisualChart =>
  withSection(chart, at.section, (section) => ({
    ...section,
    bars: section.bars.map((bar, index) => {
      if (index !== at.bar) return bar;
      const next = { ...bar, ...change };
      // A new chords line drops a split chosen for the old one (R-13.6).
      if (change.chords !== undefined && change.split === undefined) {
        const count = tokens(change.chords).length;
        if (count !== tokens(bar.chords).length) next.split = null;
      }
      return next;
    }),
  }));

/** A bar after the given one, or before it (R-13.10). */
export const insertBar = (chart: VisualChart, at: BarAt, where: "before" | "after"): VisualChart =>
  withSection(chart, at.section, (section) => {
    const bars = [...section.bars];
    const index = where === "after" ? at.bar + 1 : at.bar;
    const fresh = emptyBar();
    // Inserted before a row's first bar, the new one starts that row.
    if (where === "before" && bars[at.bar]?.row) {
      fresh.row = bars[at.bar]?.row ?? null;
      bars[at.bar] = { ...(bars[at.bar] as VisualBar), row: null };
    }
    bars.splice(index, 0, fresh);
    return { ...section, bars };
  });

export const deleteBar = (chart: VisualChart, at: BarAt): VisualChart =>
  withSection(chart, at.section, (section) => {
    const bars = [...section.bars];
    const [gone] = bars.splice(at.bar, 1);
    const next = bars[at.bar];
    if (gone?.row && next && !next.row) bars[at.bar] = { ...next, row: gone.row };
    return { ...section, bars };
  });

/** How many bars a row holds before the next bar starts a new one, as on a printed chart. */
export const ROW_BARS = 4;

/**
 * A bar at the end of a section (Tab past the last bar; R-13.5): it starts a new row once the last
 * row holds four bars, so writing never runs on in one line (R-13.10).
 */
export const appendBar = (chart: VisualChart, section: number): VisualChart =>
  withSection(chart, section, (current) => {
    const groups = rowGroups(current);
    const last = groups[groups.length - 1] ?? [];
    const fresh = emptyBar();
    if (last.length >= ROW_BARS || current.bars.length === 0) fresh.row = {};
    return { ...current, bars: [...current.bars, fresh] };
  });

/** A new row of four empty bars at the end of a section (Add a row; R-13.10). */
export const addRow = (chart: VisualChart, section: number): VisualChart =>
  withSection(chart, section, (current) => ({
    ...current,
    bars: [
      ...current.bars,
      ...Array.from({ length: ROW_BARS }, (_, index) => ({
        ...emptyBar(),
        row: index === 0 ? {} : null,
      })),
    ],
  }));

/** Deletes the whole row a bar is in (Delete this row; R-13.10). */
export const deleteRow = (chart: VisualChart, at: BarAt): VisualChart =>
  withSection(chart, at.section, (section) => {
    const row = rowGroups(section).find((group) => group.includes(at.bar)) ?? [];
    const bars = section.bars.filter((_, index) => !row.includes(index));
    // A section keeps one empty bar to write in.
    return { ...section, bars: bars.length > 0 ? bars : [emptyBar()] };
  });

/** Bars copied from the editor (R-13.10): whole, but never where their row starts. */
export interface BarClip {
  bars: VisualBar[];
  /** A whole row was copied, so pasting it after a bar starts a new row. */
  row: boolean;
}

/** Copies the selected bar, or the whole row it is in (Copy this bar, Copy this row). */
export function copyBars(chart: VisualChart, at: BarAt, what: "bar" | "row"): BarClip | null {
  const section = chart.sections[at.section];
  if (!section?.bars[at.bar]) return null;
  const indexes =
    what === "row"
      ? (rowGroups(section).find((group) => group.includes(at.bar)) ?? [at.bar])
      : [at.bar];
  return {
    bars: indexes.map((index) => ({ ...(section.bars[index] as VisualBar), row: null })),
    row: what === "row",
  };
}

const pasted = (bar: VisualBar, row: VisualBar["row"]): VisualBar => ({
  ...bar,
  split: bar.split ? [...bar.split] : null,
  ending: bar.ending ? [...bar.ending] : null,
  row,
});

/**
 * Pastes copied bars (R-13.10): over the selected bar and those after it, adding bars past the
 * section's end, or after it; each place keeps where its row starts.
 */
export const pasteBars = (
  chart: VisualChart,
  at: BarAt,
  clip: BarClip,
  where: "over" | "after",
): VisualChart =>
  withSection(chart, at.section, (section) => {
    const bars = [...section.bars];
    if (where === "over") {
      clip.bars.forEach((bar, offset) => {
        const index = at.bar + offset;
        const place = bars[index];
        if (place) {
          bars[index] = pasted(bar, place.row);
          return;
        }
        // Past the section's end a new row starts once the last one holds four bars.
        const last = rowGroups({ ...section, bars }).at(-1) ?? [];
        bars.push(pasted(bar, last.length >= ROW_BARS ? {} : null));
      });
    } else {
      const fresh = clip.bars.map((bar, offset) =>
        pasted(bar, clip.row && offset === 0 ? {} : null),
      );
      // A whole row pasted after a bar starts its own row; the bars after it, another.
      const next = bars[at.bar + 1];
      if (clip.row && next && !next.row) bars[at.bar + 1] = { ...next, row: {} };
      bars.splice(at.bar + 1, 0, ...fresh);
    }
    return { ...section, bars };
  });

/** A new row starts with the bar after this one (R-13.10). */
export const breakRowAfter = (chart: VisualChart, at: BarAt): VisualChart => {
  const next = chart.sections[at.section]?.bars[at.bar + 1];
  if (!next) return insertBar(setBar(chart, at, {}), at, "after");
  return setBar(chart, { ...at, bar: at.bar + 1 }, { row: next.row ? null : {} });
};

export const addSection = (chart: VisualChart, after: number, name: string): VisualChart => {
  const sections = [...chart.sections];
  sections.splice(after + 1, 0, emptySection(name));
  return { ...chart, sections };
};

export const renameSection = (chart: VisualChart, index: number, name: string): VisualChart => {
  const old = chart.sections[index]?.name;
  return {
    ...chart,
    sections: chart.sections.map((section, at) =>
      at === index
        ? { ...section, name }
        : section.use === old
          ? { ...section, use: name }
          : section,
    ),
  };
};

export const moveSection = (chart: VisualChart, index: number, by: -1 | 1): VisualChart => {
  const to = index + by;
  if (to < 0 || to >= chart.sections.length) return chart;
  const sections = [...chart.sections];
  const [moved] = sections.splice(index, 1);
  sections.splice(to, 0, moved as VisualSection);
  return { ...chart, sections };
};

export const duplicateSection = (chart: VisualChart, index: number, name: string): VisualChart => {
  const source = chart.sections[index];
  if (!source) return chart;
  const sections = [...chart.sections];
  sections.splice(index + 1, 0, { ...structuredClone(source), name });
  return { ...chart, sections };
};

/** The sections that repeat this one with `@use` (R-13.9): deleting it asks first. */
export const repeatsOf = (chart: VisualChart, index: number): number =>
  chart.sections.filter((section) => section.use === chart.sections[index]?.name).length;

export const deleteSection = (chart: VisualChart, index: number): VisualChart => {
  const name = chart.sections[index]?.name;
  return {
    ...chart,
    sections: chart.sections.filter((section, at) => at !== index && section.use !== name),
  };
};

/** Repeats a written section after it (`@use Chorus 2x`; R-13.9). */
export const repeatSection = (chart: VisualChart, index: number, times: number | null) => {
  const source = chart.sections[index];
  if (!source || source.use) return chart;
  const sections = [...chart.sections];
  sections.splice(index + 1, 0, {
    name: source.name,
    notes: [],
    bars: [],
    use: source.name,
    times,
    useKey: null,
  });
  return { ...chart, sections };
};

export const setTimes = (chart: VisualChart, index: number, times: number | null) =>
  withSection(chart, index, (section) => ({ ...section, times }));

export const addNote = (chart: VisualChart, index: number, note: VisualNote) =>
  withSection(chart, index, (section) => ({ ...section, notes: [...section.notes, note] }));

/** A note of a section changed in place (R-13.14). */
export const setNote = (chart: VisualChart, index: number, at: number, note: VisualNote) =>
  withSection(chart, index, (section) => ({
    ...section,
    notes: section.notes.map((current, n) => (n === at ? note : current)),
  }));

export const deleteNote = (chart: VisualChart, index: number, note: number) =>
  withSection(chart, index, (section) => ({
    ...section,
    notes: section.notes.filter((_, at) => at !== note),
  }));

/** The chord marks the tools put on a chord (R-13.7): push, stab, fermata, hold. */
export type ChordMark = "push" | "shortPush" | "stab" | "fermata" | "hold";

interface Marks {
  push: 0 | 1 | 2;
  stab: boolean;
  fermata: boolean;
  hold: boolean;
  chord: string;
}

/** The marks on one chord of a chords line, or null when it isn't a chord (`x`, `%`). */
function marksOf(token: string): Marks | null {
  if (!/^('{0,2})(<?)([b#]?[1-7]|[A-G][b#]?)/.test(token)) return null;
  let text = token;
  let stab = false;
  let fermata = false;
  while (/[!~]$/.test(text)) {
    if (text.endsWith("!")) stab = true;
    else fermata = true;
    text = text.slice(0, -1);
  }
  const push = text.startsWith("''") ? 2 : text.startsWith("'") ? 1 : 0;
  text = text.slice(push);
  const hold = text.startsWith("<") && text.endsWith(">");
  return { push, stab, fermata, hold, chord: hold ? text.slice(1, -1) : text };
}

/** Whether a chord carries a mark, so its tool shows pressed (R-13.7). */
export function hasMark(token: string, mark: ChordMark): boolean {
  const marks = marksOf(token);
  if (!marks) return false;
  if (mark === "push") return marks.push === 1;
  if (mark === "shortPush") return marks.push === 2;
  return marks[mark];
}

/** Turns a mark on or off on one chord of a chords line, as typing it would (`'5`, `5!`). */
export function toggleMark(token: string, mark: ChordMark): string {
  const marks = marksOf(token);
  if (!marks) return token;
  let { push, stab, fermata, hold } = marks;
  if (mark === "push") push = push === 1 ? 0 : 1;
  if (mark === "shortPush") push = push === 2 ? 0 : 2;
  if (mark === "stab") stab = !stab;
  if (mark === "fermata") fermata = !fermata;
  if (mark === "hold") hold = !hold;
  const chord = hold ? `<${marks.chord}>` : marks.chord;
  return `${"'".repeat(push)}${chord}${stab ? "!" : ""}${fermata ? "~" : ""}`;
}

/** A mark on the chord at `index` of a bar's chords line (the last one by default). */
export function markChord(bar: VisualBar, mark: ChordMark, index?: number): string {
  const list = tokens(bar.chords);
  const at = index ?? list.length - 1;
  return list.map((token, i) => (i === at ? toggleMark(token, mark) : token)).join(" ");
}

const pieces = (top: string) =>
  top
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

/** Whether a bar's top line holds an indication, so its tool shows pressed (R-13.7). */
export const hasIndication = (top: string, text: string) =>
  pieces(top).some((piece) => piece.toLowerCase() === text.toLowerCase());

/** An indication added to a bar's top line, unless it is there already (R-13.7). */
export const addIndication = (top: string, text: string): string =>
  hasIndication(top, text) ? top : [...pieces(top), text].join(", ");

/** An indication added to a bar's top line, or taken off when it is there (R-13.7). */
export const toggleIndication = (top: string, text: string): string =>
  hasIndication(top, text)
    ? pieces(top)
        .filter((piece) => piece.toLowerCase() !== text.toLowerCase())
        .join(", ")
    : addIndication(top, text);

/** The bar after or before, across sections (Tab and Shift + Tab; R-13.5). */
export function step(chart: VisualChart, at: BarAt, by: 1 | -1): BarAt | null {
  let { section, bar } = at;
  bar += by;
  while (section >= 0 && section < chart.sections.length) {
    const count = chart.sections[section]?.bars.length ?? 0;
    if (bar >= 0 && bar < count) return { section, bar };
    section += by;
    if (section < 0 || section >= chart.sections.length) return null;
    bar = by === 1 ? 0 : (chart.sections[section]?.bars.length ?? 0) - 1;
  }
  return null;
}
