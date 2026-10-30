import type { ReactNode } from "react";
import { authEnabled } from "../../../lib/auth/enabled";
import { isOpen, sessionFromRow, type LiveSession } from "../../../lib/live/protocol";
import { effectiveLineup } from "../../../lib/sets/lineup";
import { createClient, readUser } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import { LiveProvider } from "../../_components/live/LiveProvider";

/**
 * A set's pages share its live session (SPEC-12), so the channel stays open from song to song.
 * Only whoever may join it gets one: the band's MD, the set's temporary MD and its lineup, its
 * own or else the band's default instruments (R-12.12, R-05.3); the database says the same to anyone else.
 */
export default async function SetLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  if (!authEnabled() || !UUID.test(id)) return children;
  const supabase = await createClient();
  const { data } = await readUser(supabase);
  const user = data.user;
  if (!user) return children;
  const { data: set } = await supabase.from("sets").select("band_id").eq("id", id).maybeSingle();
  if (!set) return children;
  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase
      .from("band_members")
      .select("id, role")
      .eq("band_id", set.band_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (!member) return children;
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: temp }, { data: lineup }, { data: defaults }] = await Promise.all([
    supabase.from("set_temp_md").select("until").eq("set_id", id).eq("member_id", member.id),
    supabase.from("set_lineup").select("member_id, instrument_id").eq("set_id", id),
    supabase.from("member_instruments").select("instrument_id").eq("member_id", member.id),
  ]);
  const canLead =
    member.role === "md" ||
    (temp ?? []).some((row) => row.until === null || (row.until as string) >= today);
  // The set's own lineup, or the band's default instruments when it has none (R-05.3, F-012).
  const plays = effectiveLineup(
    [{ id: member.id, defaults: (defaults ?? []).map((row) => row.instrument_id as string) }],
    (lineup ?? []) as { member_id: string; instrument_id: string }[],
  ).get(member.id)?.length;
  if (!canLead && !plays) return children;
  // Who gets the notice when this person starts live mode: the rest of the set's lineup (T-3032).
  let audience = 0;
  if (canLead) {
    const { data: members } = await supabase
      .from("band_members")
      .select("id, instruments:member_instruments(instrument_id)")
      .eq("band_id", set.band_id)
      .neq("user_id", user.id);
    const others = (members ?? []) as { id: string; instruments: { instrument_id: string }[] }[];
    const lineupOf = effectiveLineup(
      others.map((other) => ({
        id: other.id,
        defaults: other.instruments.map((row) => row.instrument_id),
      })),
      (lineup ?? []) as { member_id: string; instrument_id: string }[],
    );
    audience = others.filter((other) => lineupOf.get(other.id)?.length).length;
  }

  const { data: row } = await supabase
    .from("live_sessions")
    .select("id, set_id, leader_id, song_position, section, cue, leader_seen_at, ended_at")
    .eq("set_id", id)
    .is("ended_at", null)
    .maybeSingle();
  let initial: LiveSession | null = null;
  if (row) {
    const { data: leader } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", row.leader_id)
      .maybeSingle();
    const session = sessionFromRow(row, (leader?.name as string | undefined) ?? "");
    initial = isOpen(session) ? session : null;
  }
  return (
    <LiveProvider
      setId={id}
      me={{ id: user.id, name: (profile?.name as string | undefined) ?? "" }}
      canLead={canLead}
      audience={audience}
      initial={initial}
    >
      {children}
    </LiveProvider>
  );
}
