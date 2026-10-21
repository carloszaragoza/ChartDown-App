"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  followAddress,
  HEARTBEAT_MS,
  isOpen,
  LEADER_TIMEOUT_MS,
  liveTopic,
  readMetronome,
  readPosition,
  samePosition,
  sessionFromRow,
  standSong,
  type LiveMetronome,
  type LivePosition,
  type LiveSession,
} from "../../../lib/live/protocol";
import { createClient } from "../../../lib/supabase/browser";

export type LiveRole = "leader" | "follower" | "none";
export type LiveStatus = "idle" | "connecting" | "live" | "paused";

/** Live mode on this device (SPEC-12): the set's session, this person's part in it, and its acts. */
export interface Live {
  me: string;
  session: LiveSession | null;
  role: LiveRole;
  canLead: boolean;
  /** Following the session; the leader always is. */
  isJoined: boolean;
  status: LiveStatus;
  /** The follower looked away from where the leader is (R-12.5). */
  isDetached: boolean;
  /** The session ended while this device was in it (R-12.10). */
  hasEnded: boolean;
  /** Where the leader is, for a follower; `seq` changes every time it should be applied. */
  target: (LivePosition & { seq: number }) | null;
  /** The leader's cue, on every device in the session (R-12.4). */
  cue: number | null;
  connected: { id: string; name: string }[];
  leaderMetronome: LiveMetronome | null;
  /** The song this device's stand mode shows, or null on another page of the set. */
  song: number | null;
  error: string | null;
  start: () => Promise<void>;
  join: () => void;
  leave: () => void;
  end: () => Promise<void>;
  handOver: (person: string) => Promise<void>;
  backToLive: () => void;
  detach: () => void;
  dismissEnded: () => void;
  /** The leader's stand mode says where it is, and which section its metronome queued. */
  report: (at: { section: number; queued: number | null }) => void;
  /** The leader marks the next section by hand, or clears it (R-12.4). */
  setCue: (section: number | null) => void;
  reportMetronome: (metronome: Omit<LiveMetronome, "song">) => void;
}

const LiveContext = createContext<Live | null>(null);

/** Live mode on this device, inside a set's pages; null elsewhere or for whoever may not join. */
export function useLive(): Live | null {
  return useContext(LiveContext);
}

const SELECT = "id, set_id, leader_id, song_position, section, cue, leader_seen_at, ended_at";
// Which sessions this device follows: kept for the tab, so a reload stays in (R-12.9).
const joinedKey = (session: string) => `cd-live-joined:${session}`;
const joinedHere = new Set<string>();
const joinedListeners = new Set<() => void>();
const joinedStore = {
  subscribe(changed: () => void) {
    joinedListeners.add(changed);
    return () => void joinedListeners.delete(changed);
  },
  has(session: string): boolean {
    try {
      return window.sessionStorage.getItem(joinedKey(session)) === "1";
    } catch {
      return joinedHere.has(session);
    }
  },
  set(session: string, joined: boolean) {
    if (joined) joinedHere.add(session);
    else joinedHere.delete(session);
    try {
      if (joined) window.sessionStorage.setItem(joinedKey(session), "1");
      else window.sessionStorage.removeItem(joinedKey(session));
    } catch {
      // Private windows: this page remembers it.
    }
    for (const changed of joinedListeners) changed();
  },
};

/**
 * A set's live session on this device (T-1601 to T-1607, Technical Plan 7.1). It sits in the
 * set's layout, so the channel stays open while the leader and the band move from song to song.
 */
export function LiveProvider({
  setId,
  me,
  canLead,
  initial,
  children,
}: {
  setId: string;
  me: { id: string; name: string };
  canLead: boolean;
  initial: LiveSession | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const song = standSong(pathname);
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<LiveSession | null>(initial);
  const role: LiveRole = !session ? "none" : session.leaderId === me.id ? "leader" : "follower";
  const sessionId = session?.id ?? null;
  const followsHere = useSyncExternalStore(
    joinedStore.subscribe,
    () => (sessionId ? joinedStore.has(sessionId) : false),
    () => false,
  );
  const isJoined = role === "leader" || (session !== null && followsHere);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [isDetached, setDetached] = useState(false);
  const [hasEnded, setEnded] = useState(false);
  const [heard, setTarget] = useState<Live["target"]>(null);
  const [cueHeard, setCueShown] = useState<number | null | undefined>(undefined);
  const [connected, setConnected] = useState<Live["connected"]>([]);
  const [leaderMetronome, setLeaderMetronome] = useState<LiveMetronome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const seq = useRef(0);
  const joinedRef = useRef(isJoined);
  useEffect(() => {
    joinedRef.current = isJoined;
  }, [isJoined]);
  // Arriving from "Live now" (/sets/<id>/live adds ?live=join); stand mode then tidies its
  // address, after this render has read it.
  const liveParam = useSearchParams().get("live");

  /** Applies where the leader is, for a follower. */
  const aim = useCallback((at: LivePosition) => {
    seq.current += 1;
    setTarget({ ...at, seq: seq.current });
    setCueShown(at.cue);
  }, []);

  // Arriving from "Live now" joins the session on this device.
  useEffect(() => {
    if (sessionId && role === "follower" && liveParam === "join") joinedStore.set(sessionId, true);
  }, [sessionId, role, liveParam]);
  // Where the leader is: the last move heard, or the session's own until one is (R-12.9).
  const [atSong, atSection, atCue] = [session?.song, session?.section, session?.cue];
  const target = useMemo<Live["target"]>(
    () =>
      heard ??
      (atSong !== undefined && atSection !== undefined
        ? { song: atSong, section: atSection, cue: atCue ?? null, seq: 0 }
        : null),
    [heard, atSong, atSection, atCue],
  );

  /** Reads the set's latest session: started, handed over or ended (Realtime on live_sessions). */
  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("live_sessions")
      .select(SELECT)
      .eq("set_id", setId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const { data: leader } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", data.leader_id)
      .maybeSingle();
    const read = sessionFromRow(data, (leader?.name as string | undefined) ?? "");
    if (isOpen(read)) {
      setSession(read);
      return read;
    }
    // It ended: whoever was in it sees so and stays where they are (R-12.10).
    setSession((now) => {
      if (now && now.id === read.id && joinedRef.current && now.leaderId !== me.id) setEnded(true);
      return null;
    });
    return null;
  }, [supabase, setId, me.id]);

  // Sessions starting and ending reach the set's open pages at once (Technical Plan 7.1).
  useEffect(() => {
    let watch: RealtimeChannel | null = null;
    let stopped = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (stopped) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (stopped) return;
      watch = supabase
        .channel(`live-set:${setId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "live_sessions", filter: `set_id=eq.${setId}` },
          () => void refresh(),
        )
        .subscribe();
    })();
    const online = () => void refresh();
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      window.removeEventListener("online", online);
      if (watch) void supabase.removeChannel(watch);
    };
  }, [supabase, setId, refresh]);

  // The session's own channel, while this device leads or follows (T-1602). Joined again when
  // control changes hands, since the channel decides who may broadcast when it is joined.
  const leaderId = session?.leaderId ?? null;
  const isLeading = role === "leader";
  useEffect(() => {
    if (!sessionId || !isJoined) return;
    let stopped = false;
    let wasPaused = false;
    let current: RealtimeChannel | null = null;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (stopped) return;
      setStatus("connecting");
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (stopped) return;
      current = supabase
        .channel(liveTopic(sessionId), {
          config: { private: true, broadcast: { self: false }, presence: { key: me.id } },
        })
        .on("broadcast", { event: "move" }, ({ payload }) => {
          const at = readPosition(payload);
          if (at) aim(at);
        })
        .on("broadcast", { event: "metronome" }, ({ payload }) => {
          setLeaderMetronome(readMetronome(payload));
        })
        .on("broadcast", { event: "leader" }, () => void refresh())
        .on("broadcast", { event: "ended" }, () => {
          setEnded(true);
          setSession(null);
        })
        .on("presence", { event: "sync" }, () => {
          const state = current?.presenceState<{ id: string; name: string }>() ?? {};
          const people = new Map<string, string>();
          for (const metas of Object.values(state))
            for (const meta of metas) people.set(meta.id, meta.name);
          setConnected([...people].map(([id, name]) => ({ id, name })));
        })
        .subscribe((state) => {
          if (state === "SUBSCRIBED") {
            setStatus("live");
            void current?.track({ id: me.id, name: me.name });
            // Back after losing the connection: to where the leader is now (R-12.9).
            if (wasPaused) {
              wasPaused = false;
              void refresh().then((now) => {
                if (now && now.leaderId !== me.id) {
                  setDetached(false);
                  aim(now);
                }
              });
            }
          } else if (!stopped) {
            wasPaused = true;
            setStatus("paused");
          }
        });
      channel.current = current;
    })();
    const offline = () => setStatus("paused");
    window.addEventListener("offline", offline);
    return () => {
      stopped = true;
      window.removeEventListener("offline", offline);
      channel.current = null;
      setStatus("idle");
      setConnected([]);
      if (current) void supabase.removeChannel(current);
    };
  }, [supabase, sessionId, isJoined, isLeading, me.id, me.name, aim, refresh]);

  // A follower whose leader is gone 5 minutes: the session counts as ended (R-12.10).
  const leaderHere = connected.some((person) => person.id === leaderId);
  useEffect(() => {
    if (role !== "follower" || !isJoined || status !== "live" || leaderHere) return;
    const gone = window.setTimeout(() => {
      setEnded(true);
      setSession(null);
    }, LEADER_TIMEOUT_MS);
    return () => window.clearTimeout(gone);
  }, [role, isJoined, status, leaderHere]);

  // A follower goes to the leader's song (R-12.3, R-12.6); within a song, stand mode moves itself.
  const pushed = useRef<string>("");
  useEffect(() => {
    if (role !== "follower" || !isJoined || isDetached || !target || song === null) return;
    if (target.song === song) return;
    const address = followAddress(setId, target, window.location.search);
    if (pushed.current === `${target.seq}`) return;
    pushed.current = `${target.seq}`;
    router.push(address);
  }, [role, isJoined, isDetached, target, song, setId, router]);

  // The leader: what was sent last, the cue marked by hand, and a beat every minute (R-12.10).
  const sent = useRef<LivePosition | null>(null);
  const reported = useRef<{ song: number; section: number; queued: number | null } | null>(null);
  const handCue = useRef<number | null>(null);
  const send = useCallback(
    (at: LivePosition, force = false) => {
      if (!sessionId || (!force && samePosition(sent.current, at))) return;
      sent.current = at;
      setCueShown(at.cue);
      void channel.current?.send({ type: "broadcast", event: "move", payload: at });
      void supabase.rpc("live_move", {
        session_id: sessionId,
        song_position: at.song,
        section: at.section,
        cue: at.cue,
      });
    },
    [sessionId, supabase],
  );
  const report = useCallback(
    (at: { section: number; queued: number | null }) => {
      if (role !== "leader" || song === null) return;
      // Reaching the section marked by hand, or another song, clears the mark.
      const before = reported.current;
      if (before && (before.section !== at.section || before.song !== song)) handCue.current = null;
      reported.current = { ...at, song };
      send({ song, section: at.section, cue: handCue.current ?? at.queued });
    },
    [role, song, send],
  );
  const setCue = useCallback(
    (section: number | null) => {
      handCue.current = section;
      const at = reported.current;
      if (role === "leader" && song !== null && at)
        send({ song, section: at.section, cue: section ?? at.queued });
    },
    [role, song, send],
  );
  useEffect(() => {
    if (role !== "leader" || !sessionId) return;
    const beat = window.setInterval(() => {
      const at = sent.current;
      if (at)
        void supabase.rpc("live_move", {
          session_id: sessionId,
          song_position: at.song,
          section: at.section,
          cue: at.cue,
        });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(beat);
  }, [role, sessionId, supabase]);
  // A new channel (a reconnection, a handover) hears where the leader is at once.
  useEffect(() => {
    if (role === "leader" && status === "live" && sent.current) send(sent.current, true);
  }, [role, status, send]);

  const lastMetronome = useRef("");
  const reportMetronome = useCallback(
    (metronome: Omit<LiveMetronome, "song">) => {
      if (role !== "leader" || song === null) return;
      const payload: LiveMetronome = { ...metronome, song };
      const key = JSON.stringify(payload);
      if (key === lastMetronome.current) return;
      lastMetronome.current = key;
      void channel.current?.send({ type: "broadcast", event: "metronome", payload });
    },
    [role, song],
  );

  const start = useCallback(async () => {
    setError(null);
    const { error: failed } = await supabase.rpc("live_start", { set_id: setId });
    if (failed) setError(failed.message.includes("live_already") ? "already" : "failed");
    sent.current = null;
    setEnded(false);
    await refresh();
  }, [supabase, setId, refresh]);
  const end = useCallback(async () => {
    if (!sessionId) return;
    await channel.current?.send({ type: "broadcast", event: "ended", payload: {} });
    await supabase.rpc("live_end", { session_id: sessionId });
    setSession(null);
    sent.current = null;
  }, [supabase, sessionId]);
  const handOver = useCallback(
    async (person: string) => {
      if (!sessionId) return;
      const { error: failed } = await supabase.rpc("live_hand_over", {
        session_id: sessionId,
        to_person: person,
      });
      if (failed) {
        setError("failed");
        return;
      }
      await channel.current?.send({ type: "broadcast", event: "leader", payload: {} });
      const now = await refresh();
      // The old leader follows from where the band is.
      if (now) {
        joinedStore.set(now.id, true);
        aim(now);
      }
    },
    [supabase, sessionId, refresh, aim],
  );
  const join = useCallback(() => {
    if (!session) return;
    joinedStore.set(session.id, true);
    setDetached(false);
    setEnded(false);
    aim(session);
  }, [session, aim]);
  const leave = useCallback(() => {
    if (session) joinedStore.set(session.id, false);
    setDetached(false);
  }, [session]);
  const backToLive = useCallback(() => {
    setDetached(false);
    if (target) aim(target);
  }, [target, aim]);
  const detach = useCallback(() => {
    if (role === "follower" && isJoined) setDetached(true);
  }, [role, isJoined]);
  const dismissEnded = useCallback(() => setEnded(false), []);

  const value: Live = {
    me: me.id,
    session,
    role,
    canLead,
    isJoined,
    status,
    isDetached,
    hasEnded,
    target,
    cue: cueHeard === undefined ? (session?.cue ?? null) : cueHeard,
    connected,
    leaderMetronome,
    song,
    error,
    start,
    join,
    leave,
    end,
    handOver,
    backToLive,
    detach,
    dismissEnded,
    report,
    setCue,
    reportMetronome,
  };
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
