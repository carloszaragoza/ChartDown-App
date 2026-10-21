import type { ReactNode } from "react";
import { authEnabled } from "../../../lib/auth/enabled";
import { isOpen, sessionFromRow, type LiveSession } from "../../../lib/live/protocol";
import { createClient, readUser } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import { LiveProvider } from "../../_components/live/LiveProvider";

/**
 * A set's pages share its live session (SPEC-12), so the channel stays open from song to song.
 * Only whoever may join it gets one: the band's MD, the set's temporary MD and its lineup
 * (R-12.12); the database says the same to anyone else.
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
  const [{ data: temp }, { count: plays }] = await Promise.all([
    supabase.from("set_temp_md").select("until").eq("set_id", id).eq("member_id", member.id),
    supabase
      .from("set_lineup")
      .select("member_id", { count: "exact", head: true })
      .eq("set_id", id)
      .eq("member_id", member.id),
  ]);
  const canLead =
    member.role === "md" ||
    (temp ?? []).some((row) => row.until === null || (row.until as string) >= today);
  if (!canLead && !plays) return children;

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
      initial={initial}
    >
      {children}
    </LiveProvider>
  );
}
