import { parseToken } from "./chord.js";
import { EVERYONE, type RoleResolver } from "./roles.js";
import type { Bar, Cue, Dynamic } from "./types.js";
import type { Warn } from "./warnings.js";

const DYNAMICS = new Set<string>(["pp", "p", "mp", "mf", "f", "ff", "cresc", "decresc"]);
const MAX_LANDMARK_WORDS = 8;

export interface RowContext {
  line: number;
  /** The meter's top number, for the beat-count check. */
  beatsPerBar: number;
  roles: RoleResolver;
  warn: Warn;
}

/** `{instrument: text}` is a cue for those players; any other text is a cue for everyone (spec 9). */
function parseCue(text: string, roles: RoleResolver): Cue {
  const match = /^([A-Za-z][A-Za-z,/& ]*?)\s*:\s*(.+)$/.exec(text);
  if (match) {
    const resolved = roles(match[1] as string);
    if (resolved) return { roles: resolved, text: (match[2] as string).trim() };
  }
  return { roles: [EVERYONE], text };
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
  const bar: Bar = { items: [], cues: [] };

  let rest = segment.replace(/"([^"]*)"/g, (_, text: string) => {
    if (text.trim().split(/\s+/).filter(Boolean).length > MAX_LANDMARK_WORDS) {
      ctx.warn(ctx.line, "landmark-too-long");
    }
    bar.lyric = bar.lyric === undefined ? text : `${bar.lyric} / ${text}`;
    return " ";
  });

  rest = rest.replace(/\{([^}]*)\}/g, (_, raw: string) => {
    const text = raw.trim();
    if (DYNAMICS.has(text.toLowerCase())) bar.dynamic = text.toLowerCase() as Dynamic;
    else if (text) bar.cues.push(parseCue(text, ctx.roles));
    return " ";
  });

  rest = rest.replace(/^\s*\[(\d+(?:[,-]\d+)*)\]/, (_, ending: string) => {
    bar.ending = parseEnding(ending);
    return " ";
  });

  for (const token of rest.trim().split(/\s+/).filter(Boolean)) {
    const item = parseToken(token);
    if (item) bar.items.push(item);
    else ctx.warn(ctx.line, "bad-token", { token });
  }
  if (bar.items.length === 0) ctx.warn(ctx.line, "empty-bar");

  const chords = bar.items.filter((item) => item.type === "chord");
  if (chords.some((chord) => chord.explicitBeats)) {
    const sum = chords.reduce((total, chord) => total + chord.beats, 0);
    if (Math.abs(sum - ctx.beatsPerBar) > 0.001) {
      ctx.warn(ctx.line, "beats-mismatch", { sum, beats: ctx.beatsPerBar });
    }
  }
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

  let repeatEnd: { times: number } | undefined;
  const end = /:\|\s*(?:x\s*(\d+))?\s*$/.exec(rest);
  if (end) {
    repeatEnd = { times: end[1] === undefined ? 2 : Number.parseInt(end[1], 10) };
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
