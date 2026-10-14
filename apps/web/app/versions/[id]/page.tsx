import { parse } from "chartdown";
import { notFound } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { guessPhone } from "../../../lib/shell/guessPhone";
import { createClient, readUser } from "../../../lib/supabase/server";
import { readDisplay } from "./display";
import { loadBasedOn, loadVersion } from "./load";
import { VersionView, type SetChoice } from "./VersionView";

/**
 * A version's public page (R-01.4): anyone reads a public version, with or without an account.
 * A version they may not read is a page not found. Its owner finds the history (R-02.8); anyone
 * else signed in may fork it (R-02.6, R-02.7).
 */
export default async function VersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    fork?: string;
    view?: string;
    key?: string;
    beats?: string;
    set?: string;
    report?: string;
  }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version?.currentRevisionId) notFound();

  const [{ data: revision }, { data: auth }, basedOn] = await Promise.all([
    supabase.from("revisions").select("content").eq("id", version.currentRevisionId).maybeSingle(),
    readUser(supabase),
    loadBasedOn(supabase, version.forkedFromId),
  ]);
  if (!revision) notFound();

  const search = await searchParams;
  const setChoices = auth.user ? await mySets(supabase, auth.user.id) : [];
  const chart = parse(revision.content);
  return (
    <VersionView
      id={version.id}
      title={version.title}
      artists={version.artists}
      author={version.author}
      source={version.source}
      chart={chart}
      display={readDisplay(chart, search)}
      path={`/versions/${version.id}`}
      signedIn={Boolean(auth.user)}
      owner={Boolean(auth.user) && auth.user?.id === version.ownerId}
      basedOn={basedOn}
      visibility={version.visibility}
      status={version.status}
      forkFailed={search.fork === "failed"}
      report={
        search.report === "open" ||
        search.report === "sent" ||
        search.report === "already" ||
        search.report === "failed"
          ? search.report
          : null
      }
      setChoices={setChoices}
      setFailed={search.set === "failed"}
      phone={await guessPhone()}
    />
  );
}

/** The sets of the bands where this person is the MD, to add the version to (R-05.2). */
async function mySets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<SetChoice[]> {
  const { data: bands } = await supabase
    .from("band_members")
    .select("band_id, band:bands(name, is_personal)")
    .eq("user_id", userId)
    .eq("role", "md");
  const names = new Map(
    (bands ?? []).map((row) => {
      const band = (Array.isArray(row.band) ? row.band[0] : row.band) as {
        name: string;
        is_personal: boolean;
      } | null;
      return [row.band_id as string, band?.is_personal ? null : (band?.name ?? "")];
    }),
  );
  if (names.size === 0) return [];
  const { data: sets } = await supabase
    .from("sets")
    .select("id, band_id, name, date")
    .in("band_id", [...names.keys()])
    .order("date", { ascending: true, nullsFirst: false });
  return (sets ?? []).map((set) => ({
    id: set.id as string,
    band: names.get(set.band_id as string) ?? null,
    name: set.name as string,
  }));
}
