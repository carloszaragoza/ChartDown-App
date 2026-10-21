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
  return {
    song: place,
    playing,
    at: whole(at, 0),
    speed: typeof speed === "number" && speed > 0 && speed <= 4 ? speed : 1,
  };
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
