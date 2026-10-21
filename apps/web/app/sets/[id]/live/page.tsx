import { notFound, redirect } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { isOpen, sessionFromRow } from "../../../../lib/live/protocol";
import { createClient } from "../../../../lib/supabase/server";
import { UUID } from "../../../versions/[id]/load";

/**
 * "Live now" opens here (R-12.2, T-1607): the set's stand mode on the leader's song and section,
 * joining the session. With no open session, the set.
 */
export default async function JoinLivePage({ params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("live_sessions")
    .select("id, set_id, leader_id, song_position, section, cue, leader_seen_at, ended_at")
    .eq("set_id", id)
    .is("ended_at", null)
    .maybeSingle();
  const session = row ? sessionFromRow(row, "") : null;
  if (!session || !isOpen(session)) redirect(`/sets/${id}`);
  const query = new URLSearchParams({
    ...(session.section > 0 ? { s: String(session.section + 1) } : {}),
    live: "join",
  });
  redirect(`/sets/${id}/songs/${session.song}/stand?${query.toString()}`);
}
