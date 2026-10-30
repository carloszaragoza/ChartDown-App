import { describe, expect, it } from "vitest";
import {
  followAddress,
  isOpen,
  LEADER_TIMEOUT_MS,
  liveTopic,
  metronomeStep,
  readMetronome,
  readPosition,
  samePosition,
  sessionFromRow,
  standSong,
  readRun,
  runStep,
  type LiveMetronome,
} from "./protocol";

describe("SPEC-12 live mode's messages", () => {
  it("R-12.12 a session has its own private channel", () => {
    expect(liveTopic("4b1c")).toBe("live:4b1c");
  });

  it("R-12.10 a session is open until it ends or its leader is gone 5 minutes", () => {
    const now = Date.parse("2026-10-21T18:00:00Z");
    const seen = (ms: number) => new Date(now - ms).toISOString();
    expect(isOpen({ endedAt: null, leaderSeenAt: seen(60_000) }, now)).toBe(true);
    expect(isOpen({ endedAt: null, leaderSeenAt: seen(LEADER_TIMEOUT_MS) }, now)).toBe(false);
    expect(isOpen({ endedAt: seen(0), leaderSeenAt: seen(0) }, now)).toBe(false);
  });

  it("R-12.3 R-12.4 a move carries the song, the section and the cue; anything else is ignored", () => {
    expect(readPosition({ song: 2, section: 3, cue: 4 })).toEqual({ song: 2, section: 3, cue: 4 });
    expect(readPosition({ song: 2, section: 0 })).toEqual({ song: 2, section: 0, cue: null });
    expect(readPosition({ song: 0, section: 1 })).toBeNull();
    expect(readPosition({ song: 1, section: -1 })).toBeNull();
    expect(readPosition("Chorus")).toBeNull();
    expect(
      samePosition({ song: 1, section: 2, cue: null }, { song: 1, section: 2, cue: null }),
    ).toBe(true);
    expect(samePosition({ song: 1, section: 2, cue: 3 }, { song: 1, section: 2, cue: null })).toBe(
      false,
    );
  });

  it("R-12.6 a follower goes to the leader's song, keeping their own view", () => {
    expect(standSong("/sets/abc/songs/3/stand")).toBe(3);
    expect(standSong("/sets/abc/songs/3")).toBeNull();
    expect(followAddress("abc", { song: 2, section: 1 }, "?view=letters&s=4&live=join")).toBe(
      "/sets/abc/songs/2/stand?view=letters&s=2",
    );
    expect(followAddress("abc", { song: 1, section: 0 }, "")).toBe("/sets/abc/songs/1/stand");
  });

  it("R-12.7 a follower's metronome starts on the leader's bar, keeps up and stops with it", () => {
    const leader = { song: 1, playing: true, at: 8, speed: 1 };
    expect(metronomeStep(leader, { song: 1, playing: false, at: undefined })).toEqual({
      kind: "start",
      at: 8,
      speed: 1,
    });
    expect(metronomeStep(leader, { song: 1, playing: true, at: 8 })).toEqual({ kind: "none" });
    expect(metronomeStep(leader, { song: 1, playing: true, at: 9 })).toEqual({ kind: "none" });
    expect(metronomeStep(leader, { song: 1, playing: true, at: undefined })).toEqual({
      kind: "none",
    });
    expect(metronomeStep(leader, { song: 1, playing: true, at: 5 })).toMatchObject({
      kind: "start",
      at: 8,
    });
    expect(metronomeStep({ ...leader, playing: false }, { song: 1, playing: true, at: 8 })).toEqual(
      { kind: "stop" },
    );
    // Another song: the follower is not there yet.
    expect(metronomeStep(leader, { song: 2, playing: false, at: undefined })).toEqual({
      kind: "none",
    });
    expect(readMetronome({ song: 1, playing: true, at: 3, speed: 0.8 })).toEqual({
      song: 1,
      playing: true,
      at: 3,
      speed: 0.8,
      // No run nor stop from a leader that doesn't share its clock yet (T-3038).
      run: null,
      stopAt: null,
    });
    expect(readMetronome({ song: 1 })).toBeNull();
  });

  it("R-12.9 a device that comes back reads where the leader is from the session", () => {
    const session = sessionFromRow(
      {
        id: "s1",
        set_id: "set",
        leader_id: "ana",
        song_position: 2,
        section: 1,
        cue: 2,
        leader_seen_at: "2026-10-21T18:00:00Z",
        ended_at: null,
      },
      "Ana",
    );
    expect(session).toMatchObject({ song: 2, section: 1, cue: 2, leaderName: "Ana" });
    expect(followAddress("set", session, "?view=letters")).toBe(
      "/sets/set/songs/2/stand?view=letters&s=2",
    );
  });
});

describe("T-3038 a follower plays the leader's runs at their moments", () => {
  const leader = (over: Partial<LiveMetronome> = {}): LiveMetronome => ({
    song: 1,
    playing: true,
    at: 0,
    speed: 1,
    run: { id: "r1", from: 4, moment: 10_000, speed: 0.9 },
    stopAt: null,
    ...over,
  });
  // The leader's clock is 250 ms ahead of this device's.
  const toLocal = (moment: number) => moment - 250;

  it("R-14.2 a new run starts at its moment on this device's clock, from its bar", () => {
    expect(runStep(leader(), null, { playing: false, stopping: null }, toLocal)).toEqual({
      kind: "start",
      run: { id: "r1", from: 4, moment: 10_000, speed: 0.9 },
      at: 9750,
    });
  });

  it("R-14.3 the run already followed changes nothing, however often it is said", () => {
    expect(runStep(leader(), "r1", { playing: true, stopping: null }, toLocal)).toEqual({
      kind: "none",
    });
  });

  it("R-14.4 a stop at the leader's moment, once; at once when the leader has stopped", () => {
    const stopping = leader({ stopAt: 12_000 });
    expect(runStep(stopping, "r1", { playing: true, stopping: null }, toLocal)).toEqual({
      kind: "stop",
      at: 11_750,
    });
    expect(runStep(stopping, "r1", { playing: true, stopping: 11_750 }, toLocal)).toEqual({
      kind: "none",
    });
    expect(
      runStep(
        leader({ playing: false, run: null }),
        "r1",
        { playing: true, stopping: null },
        toLocal,
      ),
    ).toEqual({ kind: "stop", at: null });
  });

  it("R-14.2 a run read from the channel, or nothing when it is not one", () => {
    expect(readRun({ id: "x", from: 2, moment: 5.5, speed: 1, tempo: 90 })).toEqual({
      id: "x",
      from: 2,
      moment: 5.5,
      speed: 1,
      tempo: 90,
    });
    expect(readRun({ id: "x", from: -1, moment: 1 })).toBeNull();
    expect(readRun({ from: 2, moment: 1 })).toBeNull();
    expect(
      readMetronome({
        song: 1,
        playing: true,
        at: 3,
        speed: 1,
        run: { id: "x", from: 3, moment: 9 },
        stopAt: 20,
      }),
    ).toMatchObject({ run: { id: "x", from: 3, moment: 9 }, stopAt: 20 });
  });
});
