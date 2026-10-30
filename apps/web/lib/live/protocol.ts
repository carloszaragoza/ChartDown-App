/**
 * Live mode's messages and decisions (SPEC-12, Technical Plan 7.1): what the leader's device
 * sends on the session's channel and what a follower's device does with it. Pure, so it is
 * tested without a network.
 */

/** A session as the app reads it from `live_sessions`. */
export interface LiveSession {
  id: string;
  setId: string;
  leaderId: string;
  leaderName: string;
  song: number;
  section: number;
  cue: number | null;
  /** When the leader was last heard, as an ISO date. */
  leaderSeenAt: string;
  endedAt: string | null;
}

/** Where the leader is: the song's place in the set, the section (from 0) and the cue. */
export interface LivePosition {
  song: number;
  section: number;
  cue: number | null;
}

/** The leader's metronome, while it plays (R-12.7): the bar in the play order and the speed. */
export interface LiveMetronome {
  song: number;
  playing: boolean;
  at: number | null;
  /** The practice speed as a share of the chart's tempo (1 is the chart's tempo). */
  speed: number;
  /**
   * Where its run starts on the leader's clock (SPEC-14, T-3038): the bar it plays from and the
   * moment, in the leader's milliseconds, of that bar's first beat; a new id for every change.
   */
  run?: LiveRun | null;
  /** The moment, on the leader's clock, it stops at (R-14.4). */
  stopAt?: number | null;
}

export interface LiveRun {
  id: string;
  from: number;
  moment: number;
  speed: number;
  tempo?: number;
  unit?: string;
}

/** Five minutes without the leader, and the session counts as ended (R-12.10). */
export const LEADER_TIMEOUT_MS = 5 * 60 * 1000;
/** How often the leader's device says it is still there while it does not move. */
export const HEARTBEAT_MS = 60 * 1000;

/** The earliest a leader may have been heard for their session to be open, as an ISO date. */
export function heardSince(now = Date.now()): string {
  return new Date(now - LEADER_TIMEOUT_MS).toISOString();
}

/** The session's private Realtime channel (Technical Plan 7.1). */
export function liveTopic(sessionId: string): string {
  return `live:${sessionId}`;
}

/** Whether a session is still open: not ended, and its leader heard within 5 minutes. */
export function isOpen(
  session: Pick<LiveSession, "endedAt" | "leaderSeenAt">,
  now = Date.now(),
): boolean {
  return session.endedAt === null && now - Date.parse(session.leaderSeenAt) < LEADER_TIMEOUT_MS;
}

/** A row of `live_sessions`, with its leader's name, as the app uses it. */
export function sessionFromRow(
  row: {
    id: string;
    set_id: string;
    leader_id: string;
    song_position: number;
    section: number;
    cue: number | null;
    leader_seen_at: string;
    ended_at: string | null;
  },
  leaderName: string,
): LiveSession {
  return {
    id: row.id,
    setId: row.set_id,
    leaderId: row.leader_id,
    leaderName,
    song: row.song_position,
    section: row.section,
    cue: row.cue,
    leaderSeenAt: row.leader_seen_at,
    endedAt: row.ended_at,
  };
}

const whole = (value: unknown, min: number): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= min ? value : null;

/** A move from the channel, or null when it is not one (the channel is the leader's only). */
export function readPosition(payload: unknown): LivePosition | null {
  if (!payload || typeof payload !== "object") return null;
  const { song, section, cue } = payload as Record<string, unknown>;
  const at = { song: whole(song, 1), section: whole(section, 0) };
  if (at.song === null || at.section === null) return null;
  return { song: at.song, section: at.section, cue: whole(cue, 0) };
}

/** The leader's metronome from the channel, or null when it is not one. */
export function readMetronome(payload: unknown): LiveMetronome | null {
  if (!payload || typeof payload !== "object") return null;
  const { song, playing, at, speed } = payload as Record<string, unknown>;
  const place = whole(song, 1);
  if (place === null || typeof playing !== "boolean") return null;
  const { run, stopAt } = payload as Record<string, unknown>;
  return {
    song: place,
    playing,
    at: whole(at, 0),
    speed: typeof speed === "number" && speed > 0 && speed <= 4 ? speed : 1,
    run: readRun(run),
    stopAt: typeof stopAt === "number" && Number.isFinite(stopAt) ? stopAt : null,
  };
}

/** A run from the channel (T-3038), or null when it is not one. */
export function readRun(value: unknown): LiveRun | null {
  if (!value || typeof value !== "object") return null;
  const { id, from, moment, speed, tempo, unit } = value as Record<string, unknown>;
  const bar = whole(from, 0);
  if (typeof id !== "string" || bar === null) return null;
  if (typeof moment !== "number" || !Number.isFinite(moment)) return null;
  return {
    id,
    from: bar,
    moment,
    speed: typeof speed === "number" && speed > 0 && speed <= 4 ? speed : 1,
    ...(typeof tempo === "number" && tempo > 0 ? { tempo } : {}),
    ...(typeof unit === "string" ? { unit } : {}),
  };
}

/**
 * What a follower does with the leader's run (SPEC-14, T-3038), knowing the leader's clock:
 * play from its bar at its moment, on this device's clock; stop at the leader's stop moment;
 * or nothing, when it is the run already followed.
 */
export function runStep(
  leader: LiveMetronome,
  followed: string | null,
  mine: { playing: boolean; stopping: number | null },
  toLocal: (leaderMoment: number) => number,
):
  | { kind: "start"; run: LiveRun; at: number }
  | { kind: "stop"; at: number | null }
  | { kind: "none" } {
  if (!leader.playing || leader.stopAt != null) {
    if (!mine.playing) return { kind: "none" };
    const at = leader.stopAt != null ? toLocal(leader.stopAt) : null;
    return mine.stopping !== null && at !== null && Math.abs(mine.stopping - at) < 1
      ? { kind: "none" }
      : { kind: "stop", at };
  }
  if (!leader.run || leader.run.id === followed) return { kind: "none" };
  return { kind: "start", run: leader.run, at: toLocal(leader.run.moment) };
}

/** A follower's clock question (R-14.1): who asks and when it sent, on its clock. */
export function readClockPing(payload: unknown): { from: string; sent: number } | null {
  if (!payload || typeof payload !== "object") return null;
  const { from, sent } = payload as Record<string, unknown>;
  return typeof from === "string" && typeof sent === "number" && Number.isFinite(sent)
    ? { from, sent }
    : null;
}

/** The leader's answer (R-14.1): to whom, the question's time, and the leader's two times. */
export function readClockPong(
  payload: unknown,
): { to: string; sent: number; received: number; answered: number } | null {
  if (!payload || typeof payload !== "object") return null;
  const { to, sent, received, answered } = payload as Record<string, unknown>;
  const times = [sent, received, answered];
  return typeof to === "string" &&
    times.every((time) => typeof time === "number" && Number.isFinite(time))
    ? { to, sent: sent as number, received: received as number, answered: answered as number }
    : null;
}

/** Whether two positions are the same place, the cue included. */
export function samePosition(a: LivePosition | null, b: LivePosition | null): boolean {
  return a?.song === b?.song && a?.section === b?.section && a?.cue === b?.cue;
}

/**
 * The song a set's stand mode shows, from its address (`/sets/<id>/songs/<n>/stand`), or null on
 * any other page of the set.
 */
export function standSong(pathname: string): number | null {
  const match = /^\/sets\/[^/]+\/songs\/(\d+)\/stand\/?$/.exec(pathname);
  return match ? Number(match[1]) : null;
}

/**
 * Where a follower goes to be with the leader on another song: that song's stand mode, keeping
 * the follower's own view (numbers or letters, Beats, Stage, View as) and opening the leader's
 * section.
 */
export function followAddress(
  setId: string,
  at: Pick<LivePosition, "song" | "section">,
  search: string,
): string {
  const query = new URLSearchParams(search);
  query.delete("s");
  query.delete("live");
  if (at.section > 0) query.set("s", String(at.section + 1));
  const rest = query.toString();
  return `/sets/${setId}/songs/${at.song}/stand${rest ? `?${rest}` : ""}`;
}

/**
 * What a follower's metronome does with the leader's (R-12.7): start from the leader's bar, stop,
 * catch up when it is more than a bar off, or nothing. The click stays the follower's choice.
 */
export function metronomeStep(
  leader: LiveMetronome | null,
  mine: { song: number; playing: boolean; at: number | undefined },
): { kind: "start"; at: number; speed: number } | { kind: "stop" } | { kind: "none" } {
  if (!leader || leader.song !== mine.song) return { kind: "none" };
  if (!leader.playing) return mine.playing ? { kind: "stop" } : { kind: "none" };
  if (leader.at === null) return { kind: "none" };
  if (!mine.playing) return { kind: "start", at: leader.at, speed: leader.speed };
  // Just started, before its first bar: wait for it. A message arrives a little after the bar
  // starts, so a bar ahead is the same beat.
  if (mine.at === undefined || mine.at === leader.at || mine.at === leader.at + 1)
    return { kind: "none" };
  return { kind: "start", at: leader.at, speed: leader.speed };
}
