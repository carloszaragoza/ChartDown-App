import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { heardSince } from "../../../lib/live/protocol";

/**
 * "Live now" on Home and on a set (R-12.2, T-1607): each open session the person may join, with
 * who leads it and Join, which opens the leader's song. Row-level security shows only the sessions
 * of sets they are in; a session they lead themselves is not news to them.
 */
export async function LiveNow({
  supabase,
  me,
  setId,
}: {
  supabase: SupabaseClient;
  me: string;
  setId?: string;
}) {
  let query = supabase
    .from("live_sessions")
    .select("id, set_id, leader_id, set:sets(name)")
    .is("ended_at", null)
    .gt("leader_seen_at", heardSince())
    .neq("leader_id", me);
  if (setId) query = query.eq("set_id", setId);
  const { data: sessions } = await query;
  if (!sessions?.length) return null;
  const { data: leaders } = await supabase
    .from("profiles")
    .select("id, name")
    .in(
      "id",
      sessions.map((session) => session.leader_id as string),
    );
  const nameOf = new Map((leaders ?? []).map((row) => [row.id as string, row.name as string]));
  const t = await getTranslations("live");
  return (
    <VStack gap={2}>
      {sessions.map((session) => {
        const set = (Array.isArray(session.set) ? session.set[0] : session.set) as {
          name: string;
        } | null;
        return (
          <Banner
            key={session.id as string}
            status="info"
            title={t("banner", { set: set?.name ?? "" })}
            description={t("bannerLeader", {
              name: nameOf.get(session.leader_id as string) ?? "",
            })}
            endContent={
              <Button label={t("join")} variant="primary" href={`/sets/${session.set_id}/live`} />
            }
          />
        );
      })}
    </VStack>
  );
}
