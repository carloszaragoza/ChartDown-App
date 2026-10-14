import { notFound, redirect } from "next/navigation";
import { authEnabled } from "../../lib/auth/enabled";
import { localToday } from "../../lib/sets/today";
import { nextSet } from "../../lib/sets/when";
import { createClient } from "../../lib/supabase/server";

/**
 * Stand mode in the side navigation (Design Handoff 2.0, section 4): opens the next set from
 * today in stand mode, or the sets list when there is none or it has no songs yet.
 */
export default async function StandEntry() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/stand");
  // Row-level security returns the sets of the person's bands.
  const { data } = await supabase.from("sets").select("id, name, date, time, set_items(count)");
  type Row = {
    id: string;
    name: string;
    date: string | null;
    time: string | null;
    set_items: { count: number }[];
  };
  const next = nextSet((data ?? []) as Row[], await localToday());
  if (!next) redirect("/sets");
  redirect(
    (next.set_items[0]?.count ?? 0) > 0 ? `/sets/${next.id}/songs/1/stand` : `/sets/${next.id}`,
  );
}
