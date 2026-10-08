import { layoutBeats } from "./beats.js";
import { parseRiff, parseToken } from "./chord.js";
import { PASS_PREFIX, parsePasses } from "./header.js";
import { EVERYONE, type RoleResolver } from "./roles.js";
import type { Bar, BarItem, Cue, Dynamic, Meter, NavMark, TempoMark } from "./types.js";
import type { Warn } from "./warnings.js";

const DYNAMICS = new Set<string>(["pp", "p", "mp", "mf", "f", "ff", "cresc", "decresc"]);
const TEMPO_MARKS = new Set<string>(["rit", "accel", "atempo"]);
const NAV_MARKS = new Set<string>([
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
const MAX_LANDMARK_WORDS = 8;
const CUE = /^([A-Za-z][A-Za-z,/& ]*?)\s*:\s*(.+)$/;

/** Reserved words in `{ }` are compared without case, dots or spaces (spec 9). */
const reserved = (text: string) => text.toLowerCase().replace(/[.\s]/g, "");

export interface RowContext {
  line: number;
  /** The top number of the meter in effect, for the beat-count check (spec 11.2). */
  beatsPerBar: number;
  roles: RoleResolver;
  warn: Warn;
}

/**
 * `{instrument: text}` is a cue for those players; any other text is a cue for everyone
 * (spec 9). `{2x drums: text}` is for one pass (spec 9.1). An unknown name before a colon is a
 * warning, and the whole cue is kept for everyone so nothing is lost (spec 4.1).
 */
function parseCue(text: string, ctx: RowContext): Cue {
  const pass = PASS_PREFIX.exec(text);
  if (pass) {
    const passes = parsePasses(pass[1] as string);
    const rest = pass[2] as string;
    if (rest.startsWith(":")) return { roles: [EVERYONE], passes, text: rest.slice(1).trim() };
    const match = CUE.exec(rest);
    if (match) {
      const resolved = ctx.roles(match[1] as string);
      if (resolved) return { roles: resolved, passes, text: (match[2] as string).trim() };
      ctx.warn(ctx.line, "unknown-cue-instrument", { name: match[1] as string });
      return { roles: [EVERYONE], passes: [], text };
    }
  }
  const match = CUE.exec(text);
  if (match) {
    const resolved = ctx.roles(match[1] as string);
    if (resolved) return { roles: resolved, passes: [], text: (match[2] as string).trim() };
    ctx.warn(ctx.line, "unknown-cue-instrument", { name: match[1] as string });
  }
  return { roles: [EVERYONE], passes: [], text };
}

/** Endings like "1", "1,2" or "2-3" (spec 10). */
function parseEnding(text: string): number[] {
  const passes: number[] = [];
  for (const part of text.split(",")) {
    const [from, to = from] = part.split("-").map(Number);
    for (let pass = from as number; pass <= (to as number); pass++) passes.push(pass);
  }
  return passes;
}

function parseBar(segment: string, ctx: RowContext): Bar {
  const bar: Bar = { number: 0, items: [], cues: [] };
  let beatsPerBar = ctx.beatsPerBar;

  let rest = segment.replace(/"([^"]*)"/g, (_, text: string) => {
    // A word is anything between spaces (Constitution 6, ChartDown spec 9).
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > MAX_LANDMARK_WORDS) {
      ctx.warn(ctx.line, "landmark-too-long", { words, max: MAX_LANDMARK_WORDS });
    }
    bar.lyric = bar.lyric === undefined ? text : `${bar.lyric} / ${text}`;
    return " ";
  });

  rest = rest.replace(/\{([^}]*)\}/g, (_, raw: string) => {
    const text = raw.trim();
    const word = reserved(text);
    if (DYNAMICS.has(word)) bar.dynamic = word as Dynamic;
    else if (TEMPO_MARKS.has(word)) bar.tempoMark = word as TempoMark;
    else if (NAV_MARKS.has(word)) (bar.nav ??= []).push(word as NavMark);
    else if (text) bar.cues.push(parseCue(text, ctx));
    return " ";
  });

  rest = rest.replace(/^\s*\[p:(\d+(?:\.\d+)?)\]/, (_, beats: string) => {
    bar.pickup = Number.parseFloat(beats);
    return " ";
  });
  rest = rest.replace(/^\s*\[m:(\d+)\s*\/\s*(\d+)\]/, (_, top: string, unit: string) => {
    bar.meter = { beats: Number(top), unit: Number(unit) } satisfies Meter;
    return " ";
  });
  if (bar.meter !== undefined && bar.pickup !== undefined) {
    ctx.warn(ctx.line, "pickup-and-meter");
    delete bar.meter;
  }
  if (bar.meter !== undefined) beatsPerBar = bar.meter.beats;
  if (bar.pickup !== undefined && !(bar.pickup > 0 && bar.pickup < beatsPerBar)) {
    ctx.warn(ctx.line, "pickup-length", { beats: beatsPerBar });
    delete bar.pickup;
  }

  rest = rest.replace(/^\s*\[(\d+(?:[,-]\d+)*)\]/, (_, ending: string) => {
    bar.ending = parseEnding(ending);
    return " ";
  });

  const tokens = rest.match(/R\[[^\]]*\](?::\d+(?:\.\d+)?)?|\S+/g) ?? [];
  for (const token of tokens) {
    const item: BarItem | undefined = token.startsWith("R[")
      ? parseRiff(token, (code, values) => ctx.warn(ctx.line, code, values))
      : parseToken(token);
    if (item) bar.items.push(item);
    else ctx.warn(ctx.line, "bad-token", { token });
  }
  if (bar.items.length === 0) ctx.warn(ctx.line, "empty-bar");

  // Spec 5.1: tokens without `:beats` share what is left of the bar.
  const total = bar.pickup ?? beatsPerBar;
  const timed = bar.items.flatMap((item) =>
    item.type === "chord" || item.type === "no-chord" || item.type === "riff" ? [item] : [],
  );
  const { shares, used } = layoutBeats(timed, total);
  if (timed.some((item) => item.explicitBeats === true)) {
    const open = timed.some((item) => item.explicitBeats !== true);
    if (open ? used > total - 0.001 : Math.abs(used - total) > 0.001) {
      ctx.warn(ctx.line, bar.pickup === undefined ? "beats-mismatch" : "pickup-beats-mismatch", {
        sum: used,
        beats: total,
      });
    }
  }
  timed.forEach((item, index) => {
    if (item.type !== "riff") return;
    const space = shares[index] as number;
    const { used: written } = layoutBeats(item.notes, space);
    if (
      item.notes.some((note) => note.explicitBeats) &&
      item.notes.every((note) => note.explicitBeats) &&
      Math.abs(written - space) > 0.001
    ) {
      ctx.warn(ctx.line, "riff-beats-mismatch", { sum: written, beats: space });
    }
  });
  return bar;
}

/** One row of bars separated by `|`, with optional repeat marks (spec 5 and 10). */
export function parseRow(text: string, ctx: RowContext): Bar[] | undefined {
  let rest = text;
  let repeatStart = false;
  if (rest.startsWith("|:")) {
    repeatStart = true;
    rest = rest.slice(2);
  } else if (rest.startsWith("|")) {
    rest = rest.slice(1);
  }

  // `:| 3x` and `:| x3` both count the passes in total (spec 10); the default is 2.
  let repeatEnd: { times: number } | undefined;
  const end = /:\|\s*(?:[xX]\s*(\d+)|(\d+)\s*[xX])?\s*$/.exec(rest);
  if (end) {
    const written = end[1] ?? end[2];
    repeatEnd = { times: written === undefined ? 2 : Number.parseInt(written, 10) };
    rest = rest.slice(0, end.index);
  } else if (rest.endsWith("|")) {
    rest = rest.slice(0, -1);
  }

  const bars = rest
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => parseBar(segment, ctx));
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (first === undefined || last === undefined) return undefined;
  if (repeatStart) first.repeatStart = true;
  if (repeatEnd) last.repeatEnd = repeatEnd;
  return bars;
}
