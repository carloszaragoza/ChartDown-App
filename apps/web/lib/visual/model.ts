// The visual editor's chart (SPEC-13, T-3002): sections and bars as the author edits them, each
// bar with its three lines, written back as ChartDown text and saved in its canonical form.
import {
  EVERYONE,
  parse,
  STANDARD_INSTRUMENTS,
  toJSON,
  write,
  type BarJson,
  type ChartJson,
  type ItemJson,
  type RowJson,
} from "chartdown";

/** A note of a section, as ChartDown writes it (`> MD 2x keys: Pad only`; R-13.14). */
export interface VisualNote {
  md: boolean;
  roles: string[];
  passes: number[];
  text: string;
}

/** Key, meter and tempo in effect from a row on (`@key`, `@meter`, `@tempo`; R-13.10). */
export interface RowStart {
  key: string;
  meter: string;
  tempo: string;
}

export interface VisualBar {
  /** The chords line, as typed: ChartDown tokens without their beats (`1 6m7 '5sus`; R-13.5). */
  chords: string;
  /** The beats of each timed token when they don't split evenly (R-13.6); null splits evenly. */
  split: number[] | null;
  /** The indications line: dynamics, navigation, tempo marks and cues, by commas (R-13.4). */
  top: string;
  /** The lyric landmark, 8 words at most (R-13.4). */
  lyric: string;
  repeatStart: boolean;
  /** How many times the repeat that ends here plays (R-13.7); null with no repeat end. */
  repeatEnd: number | null;
  ending: number[] | null;
  /** The beats of a pickup bar (R-13.7). */
  pickup: number | null;
  /** The bar's own meter (`[m:3/4]`). */
  meter: string | null;
  /** A row starts with this bar; with what changes there. */
  row: Partial<RowStart> | null;
}

export interface VisualSection {
  name: string;
  notes: VisualNote[];
  bars: VisualBar[];
  /** The section it repeats (`@use`; R-13.9): read-only, with no bars of its own. */
  use: string | null;
  times: number | null;
  /** A key change for a repeat (`@key` before `@use`). */
  useKey: string | null;
}

export interface VisualChart {
  /** The header's fields, title left out (the editor's header holds it). */
  meta: Record<string, string>;
  sections: VisualSection[];
}

export const emptyBar = (): VisualBar => ({
  chords: "",
  split: null,
  top: "",
  lyric: "",
  repeatStart: false,
  repeatEnd: null,
  ending: null,
  pickup: null,
  meter: null,
  row: null,
});

export const emptySection = (name: string, bars = 4): VisualSection => ({
  name,
  notes: [],
  bars: Array.from({ length: bars }, (_, index) => ({
    ...emptyBar(),
    row: index === 0 ? {} : null,
  })),
  use: null,
  times: null,
  useKey: null,
});

/** The tokens of a chords line: a riff `R[ … ]` is one token (spec 7.1). */
export function tokens(chords: string): string[] {
  return chords.match(/R\[[^\]]*\](?::\d+(?:\.\d+)?)?|\S+/g) ?? [];
}

// The chord quality vocabulary, as chartdown's chord.ts reads it (spec 6, ChartDown 0.7).
const QUALITY =
  /^(?:5|(?:m|dim|aug)?(?:maj(?:7|9|11|13)|6|7|9|11|13|69)?(?:[b#](?:5|9|11|13))*(?:alt)?(?:sus2?)?(?:add(?:2|4|9|11|13))*)$/;

/** Whether ChartDown reads a token as written (R-13.4: one it doesn't is drawn in red). */
export function isKnownToken(token: string): boolean {
  const chart = parse(`## A\n${token}\n`);
  const item = chart.sections[0]?.rows[0]?.bars[0]?.items[0];
  if (chart.warnings.length > 0 || !item) return false;
  return item.type !== "chord" || QUALITY.test(item.quality);
}

const isTimed = (token: string) => token !== "%" && token !== "=";

/** The beats a bar holds: a pickup's, else its meter's top number. */
export const barBeats = (bar: VisualBar, meter: string): number =>
  bar.pickup ?? (Number((bar.meter ?? meter).split("/")[0]) || 4);

const compound = (meter: string) => {
  const [top, unit] = meter.split("/").map(Number);
  return unit === 8 && top !== undefined && top > 3 && top % 3 === 0;
};

/** Every way to split `total` into `parts` positive whole numbers, in order. */
function compositions(total: number, parts: number): number[][] {
  if (parts === 1) return total >= 1 ? [[total]] : [];
  const out: number[][] = [];
  for (let first = total - parts + 1; first >= 1; first--) {
    for (const rest of compositions(total - first, parts - 1)) out.push([first, ...rest]);
  }
  return out;
}

export type SplitNeed =
  /** The chords share the bar evenly, or the bar has none (R-13.6). */
  | { kind: "even" }
  /** The author chooses one of these (2+1+1, 1+2+1, 1+1+2). */
  | { kind: "choose"; options: number[][] }
  /** More chords than beats: the bar is marked (R-13.8). */
  | { kind: "over" };

/**
 * How a bar's chords split its beats (R-13.6): evenly when the beats divide by the chords,
 * otherwise a choice; in a compound meter (6/8, 9/8, 12/8) the split counts the tempo's beat, the
 * dotted quarter, and the eighths when there are more chords than dotted quarters.
 */
export function splitNeed(bar: VisualBar, meter: string): SplitNeed {
  const timed = tokens(bar.chords).filter(isTimed).length;
  if (timed <= 1) return { kind: "even" };
  const beats = barBeats(bar, meter);
  const own = bar.meter ?? meter;
  // A compound meter counts its dotted quarters; with more chords than those, its eighths.
  const pulses = compound(own) && bar.pickup === null ? beats / 3 : beats;
  const step = timed > pulses ? 1 : beats / pulses;
  const units = beats / step;
  if (Number.isInteger(units / timed)) return { kind: "even" };
  if (timed > units) return { kind: "over" };
  return { kind: "choose", options: compositions(units, timed).map((o) => o.map((u) => u * step)) };
}

/** Whether a bar is marked in amber (R-13.8): a split not chosen, or more chords than beats. */
export function needsAttention(bar: VisualBar, meter: string): boolean {
  const need = splitNeed(bar, meter);
  if (need.kind === "over") return true;
  if (need.kind === "choose") {
    return !need.options.some((option) => sameSplit(option, bar.split));
  }
  return false;
}

const sameSplit = (a: number[], b: number[] | null) =>
  b !== null && a.length === b.length && a.every((value, index) => value === b[index]);

/** A token with its beats written (`5:2!`), before its stab and fermata (spec 6 to 8). */
function withBeats(token: string, beats: number): string {
  const marks = /[!~]*$/.exec(token)?.[0] ?? "";
  return `${token.slice(0, token.length - marks.length)}:${beats}${marks}`;
}

const DYNAMICS = new Set(["pp", "p", "mp", "mf", "f", "ff", "cresc", "decresc"]);
const DYNAMIC_ALIAS: Record<string, string> = {
  dim: "decresc",
  decrescendo: "decresc",
  crescendo: "cresc",
};
const RESERVED = new Set([
  "rit",
  "accel",
  "atempo",
  "segno",
  "coda",
  "tocoda",
  "fine",
  "ds",
  "dsalcoda",
  "dsalfine",
  "dc",
  "dcalcoda",
  "dcalfine",
]);
const reserved = (text: string) => text.toLowerCase().replace(/[.\s]/g, "");
const INSTRUMENT_NAMES = new Set(STANDARD_INSTRUMENTS.flatMap((instrument) => instrument.names));

/**
 * One indication as typed in a bar's top line, as ChartDown writes it (R-13.4): a dynamic, a
 * tempo mark or navigation as a reserved word (`{mf}`, `{D.S. al coda}`); "Drums in" as a cue for
 * the drums (`{drums: in}`); anything else a cue for everyone.
 */
export function indication(text: string): string {
  const word = reserved(text);
  if (DYNAMICS.has(word) || RESERVED.has(word)) return `{${text}}`;
  if (DYNAMIC_ALIAS[word]) return `{${DYNAMIC_ALIAS[word]}}`;
  if (text.includes(":")) return `{${text}}`;
  const [first = "", ...rest] = text.split(/\s+/);
  if (rest.length > 0 && INSTRUMENT_NAMES.has(first.toLowerCase())) {
    return `{${first.toLowerCase()}: ${rest.join(" ")}}`;
  }
  return `{${text}}`;
}

/** The words of a lyric landmark (R-13.4). */
export const lyricWords = (lyric: string) => lyric.split(/\s+/).filter(Boolean).length;
export const MAX_LYRIC_WORDS = 8;

/**
 * The bars of each row of a section, by their place in it. Repeat signs sit at a row's edges
 * (spec C.4), so a repeat starts a row and ends one.
 */
export function rowGroups(section: VisualSection): number[][] {
  const rows: number[][] = [];
  section.bars.forEach((bar, index) => {
    const previous = section.bars[index - 1];
    if (index === 0 || bar.row || bar.repeatStart || previous?.repeatEnd) rows.push([]);
    rows[rows.length - 1]?.push(index);
  });
  return rows;
}

/** One bar as ChartDown text; an empty bar is written as `x` when `blank` says so. */
function barText(bar: VisualBar, meter: string, blank: "rest" | "skip"): string | null {
  const parts: string[] = [];
  if (bar.pickup !== null) parts.push(`[p:${bar.pickup}]`);
  else if (bar.meter) parts.push(`[m:${bar.meter}]`);
  if (bar.ending) parts.push(`[${bar.ending.join(",")}]`);
  const list = tokens(bar.chords);
  if (list.length === 0) {
    if (blank === "skip") return null;
    parts.push("x");
  } else {
    const need = splitNeed(bar, meter);
    const split = need.kind === "choose" && bar.split?.length === list.filter(isTimed).length;
    let next = 0;
    for (const token of list) {
      parts.push(split && isTimed(token) ? withBeats(token, bar.split?.[next++] ?? 1) : token);
    }
  }
  for (const piece of bar.top.split(",")) {
    const text = piece.trim();
    if (text) parts.push(indication(text));
  }
  const lyric = bar.lyric.replace(/"/g, "").trim();
  if (lyric) parts.push(`"${lyric.split(/\s+/).slice(0, MAX_LYRIC_WORDS).join(" ")}"`);
  return parts.join(" ");
}

/**
 * The chart as ChartDown text (R-13.1). For drawing, an empty bar is written as a rest so it keeps
 * its place (`blank: "rest"`, the editor draws it empty); for saving it is left out.
 */
export function chartText(chart: VisualChart, blank: "rest" | "skip" = "skip"): string {
  const out = ["---"];
  for (const [name, value] of Object.entries(chart.meta)) out.push(`${name}: ${value}`);
  out.push("---");
  let meter = chart.meta.meter ?? "4/4";
  for (const section of chart.sections) {
    out.push("", `## ${section.name}`);
    for (const note of section.notes) {
      const who = [
        note.passes.map((pass) => `${pass}x`).join(","),
        note.roles.filter((role) => role !== EVERYONE).join(", "),
      ]
        .filter(Boolean)
        .join(" ");
      out.push(note.md ? `> MD${who ? ` ${who}` : ""}: ${note.text}` : `> ${note.text}`);
    }
    if (section.use) {
      if (section.useKey) out.push(`@key ${section.useKey}`);
      out.push(`@use ${section.use}${section.times ? ` ${section.times}x` : ""}`);
      continue;
    }
    for (const group of rowGroups(section)) {
      const row = group.map((index) => section.bars[index] as VisualBar);
      const first = row[0] as VisualBar;
      const last = row[row.length - 1] as VisualBar;
      if (first.row?.key) out.push(`@key ${first.row.key}`);
      if (first.row?.meter) {
        out.push(`@meter ${first.row.meter}`);
        meter = first.row.meter;
      }
      if (first.row?.tempo) out.push(`@tempo ${first.row.tempo}`);
      const texts = row.flatMap((bar) => barText(bar, meter, blank) ?? []);
      if (texts.length === 0) continue;
      out.push(
        (first.repeatStart ? "|: " : "") +
          texts.join(" | ") +
          (last.repeatEnd ? ` :|${last.repeatEnd !== 2 ? ` ${last.repeatEnd}x` : ""}` : ""),
      );
    }
  }
  return `${out.join("\n")}\n`;
}

/** What is saved: the chart's canonical text (R-00.19), title included (R-13.1). */
export function canonicalText(chart: VisualChart, title: string): string {
  const json = toJSON(parse(chartText(chart, "skip")));
  json.meta = title ? { title, ...json.meta } : json.meta;
  return write(json);
}

/** A token of a bar as ChartDown writes it, without its beats (spec C.5). */
function itemText(item: ItemJson): string {
  if (item.type === "repeat") return "%";
  if (item.type === "tie") return "=";
  if (item.type === "rest") return "x";
  if (item.type === "riff") {
    return `R[ ${item.notes.map((note) => (note.rest ? "x" : (note.root ?? ""))).join(" ")} ]`;
  }
  const chord = item.root + item.quality + (item.bass ? `/${item.bass}` : "");
  return (
    ["", "'", "''"][item.push] +
    (item.hold ? `<${chord}>` : chord) +
    (item.stab ? "!" : "") +
    (item.fermata ? "~" : "")
  );
}

const NAV_TEXT: Record<string, string> = {
  segno: "Segno",
  coda: "Coda",
  tocoda: "To Coda",
  fine: "Fine",
  ds: "D.S.",
  dsalcoda: "D.S. al Coda",
  dsalfine: "D.S. al Fine",
  dc: "D.C.",
  dcalcoda: "D.C. al Coda",
  dcalfine: "D.C. al Fine",
};
const TEMPO_TEXT: Record<string, string> = { rit: "rit.", accel: "accel.", atempo: "a tempo" };

/** A bar of the JSON form as the visual editor holds it. */
function visualBar(bar: BarJson, row: Partial<RowStart> | null): VisualBar {
  const timed = bar.items.filter((item) => item.type !== "repeat" && item.type !== "tie");
  const shares = timed.map((item) => ("beats" in item ? item.beats : 0));
  const even = shares.every((share) => Math.abs(share - (shares[0] ?? 0)) < 1e-9);
  const top = [
    ...bar.nav.filter((mark) => mark === "segno" || mark === "coda").map((m) => NAV_TEXT[m]),
    bar.dynamic ?? "",
    bar.tempoMark ? TEMPO_TEXT[bar.tempoMark] : "",
    ...bar.cues.map((cue) => {
      const who = [
        cue.passes.map((pass) => `${pass}x`).join(","),
        cue.roles.filter((role) => role !== EVERYONE).join(" & "),
      ]
        .filter(Boolean)
        .join(" ");
      return who ? `${who}: ${cue.text}` : cue.text;
    }),
    ...bar.nav.filter((mark) => mark !== "segno" && mark !== "coda").map((m) => NAV_TEXT[m]),
  ].filter(Boolean);
  return {
    chords: bar.items.map(itemText).join(" "),
    split: even ? null : shares,
    top: top.join(", "),
    lyric: bar.lyric ?? "",
    repeatStart: bar.repeatStart,
    repeatEnd: bar.repeatEnd ? (bar.times ?? 2) : null,
    ending: bar.ending,
    pickup: bar.pickup ? bar.beats : null,
    meter: bar.pickup ? null : bar.meter,
    row,
  };
}

const keyText = (row: Pick<RowJson, "key" | "minor">) => `${row.key}${row.minor ? "m" : ""}`;

/**
 * A chart's text as the visual editor holds it (R-13.1). Only a chart with no warnings is opened
 * here (R-13.8); the title is the editor header's.
 */
export function visualChart(text: string): VisualChart {
  const json: ChartJson = toJSON(parse(text));
  // The title is the editor header's, and the version is written on saving.
  const meta = { ...json.meta };
  delete meta.title;
  delete meta.chartdown;
  let key = keyText(json);
  let meter = meta.meter ?? "4/4";
  let tempo = json.sections[0]?.rows[0]?.tempo ?? null;
  const sections = json.sections.map((section): VisualSection => {
    if (section.use) {
      const first = section.rows[0];
      const useKey = first && keyText(first) !== key ? keyText(first) : null;
      if (useKey) key = useKey;
      return {
        name: section.name,
        notes: section.notes,
        bars: [],
        use: section.use,
        times: section.times,
        useKey,
      };
    }
    const bars = section.rows.flatMap((row) => {
      const start: Partial<RowStart> = {};
      if (keyText(row) !== key) start.key = key = keyText(row);
      if (row.meter !== meter) start.meter = meter = row.meter;
      if (row.tempo !== null && row.tempo !== tempo) {
        tempo = row.tempo;
        start.tempo = String(row.tempo);
      }
      return row.bars.map((bar, index) => visualBar(bar, index === 0 ? start : null));
    });
    // A section with no bars yet opens with empty ones to write in (R-13.3).
    return {
      name: section.name,
      notes: section.notes,
      bars: bars.length > 0 ? bars : emptySection(section.name).bars,
      use: null,
      times: null,
      useKey: null,
    };
  });
  return { meta, sections };
}

/** The meter in effect at each bar of each section, for splits and their marks. */
export function meters(chart: VisualChart): string[][] {
  let meter = chart.meta.meter ?? "4/4";
  return chart.sections.map((section) =>
    section.bars.map((bar) => {
      if (bar.row?.meter) meter = bar.row.meter;
      return meter;
    }),
  );
}

/** The next section's suggested name: "Verse 2" after "Verse 1" (R-13.9). */
export function nextName(sections: readonly VisualSection[], fallback: string): string {
  const last = sections[sections.length - 1]?.name ?? "";
  const match = /^(.*?)(\d+)$/.exec(last.trim());
  if (!match) return fallback;
  const base = match[1] ?? "";
  let number = Number(match[2]) + 1;
  while (sections.some((section) => section.name === `${base}${number}`)) number++;
  return `${base}${number}`;
}

/** The parts of a song a section's name says, in the order songs most often take them. */
type Part = "intro" | "verse" | "preChorus" | "chorus" | "interlude" | "bridge" | "outro" | "tag";

const PART_NAMES: Record<"en" | "es", Record<Part, string>> = {
  en: {
    intro: "Intro",
    verse: "Verse",
    preChorus: "Pre-Chorus",
    chorus: "Chorus",
    interlude: "Interlude",
    bridge: "Bridge",
    outro: "Outro",
    tag: "Tag",
  },
  es: {
    intro: "Intro",
    verse: "Verso",
    preChorus: "Pre-Coro",
    chorus: "Coro",
    interlude: "Interludio",
    bridge: "Puente",
    outro: "Final",
    tag: "Tag",
  },
};

// How a name is read, in English or Spanish; the first that matches wins.
const PART_WORDS: [Part, "en" | "es" | null, RegExp][] = [
  ["preChorus", "en", /^pre-?\s?chorus/i],
  ["preChorus", "es", /^pre-?\s?coro/i],
  ["verse", "en", /^verse/i],
  ["verse", "es", /^verso/i],
  ["chorus", "en", /^chorus/i],
  ["chorus", "es", /^coro/i],
  ["interlude", "en", /^(interlude|instrumental|inst\b)/i],
  ["interlude", "es", /^interludio/i],
  ["bridge", "en", /^bridge/i],
  ["bridge", "es", /^puente/i],
  ["outro", "en", /^(outro|ending|end)\b/i],
  ["outro", "es", /^final/i],
  ["intro", null, /^intro/i],
  ["tag", null, /^tag/i],
];

/** What follows each part most often (owner's request, October 26, 2026; R-13.9). */
const FOLLOWS: Record<Part, Part> = {
  intro: "verse",
  verse: "chorus",
  preChorus: "chorus",
  chorus: "interlude",
  interlude: "bridge",
  bridge: "verse",
  outro: "outro",
  tag: "outro",
};

const partOf = (name: string) => {
  const found = PART_WORDS.find(([, , pattern]) => pattern.test(name.trim()));
  return found ? { part: found[0], language: found[1] } : null;
};

/**
 * The name a section added after another one takes (R-13.9), as songs most often go: Verse 1 is
 * followed by Verse 2, a second verse by the Chorus, then Interlude, Bridge and a verse again; an
 * Intro by Verse 1, a Pre-Chorus by the Chorus. A verse takes the next number free; another part
 * its name, numbered from 2 once it is taken. Written in the language of the section it follows,
 * or the interface's.
 */
export function suggestSection(
  sections: readonly VisualSection[],
  after: number,
  language: "en" | "es",
): string {
  const current = sections[after];
  const found = current ? partOf(current.name) : null;
  const words = PART_NAMES[found?.language ?? language];
  const taken = new Set(sections.map((section) => section.name.trim().toLowerCase()));
  const free = (base: string, from: number) => {
    let number = from;
    while (taken.has(`${base} ${number}`.toLowerCase())) number++;
    return `${base} ${number}`;
  };
  if (!found) return current ? free(words.verse, 1) : `${words.verse} 1`;
  // The first verse is followed by the second; the second and later ones by the chorus.
  const number = Number(/(\d+)$/.exec(current?.name.trim() ?? "")?.[1] ?? 1);
  const secondFree = !taken.has(`${words.verse} 2`.toLowerCase());
  const next =
    found.part === "verse"
      ? number === 1 && secondFree
        ? "verse"
        : "chorus"
      : FOLLOWS[found.part];
  if (next === "verse") return free(words.verse, 1);
  const base = words[next];
  return taken.has(base.toLowerCase()) ? free(base, 2) : base;
}
