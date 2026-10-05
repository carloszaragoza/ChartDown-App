import { parse } from "@chartdown/core";
import { notFound } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { readDisplay } from "./display";
import { loadBasedOn, loadVersion } from "./load";
import { VersionView } from "./VersionView";

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
  searchParams: Promise<{ fork?: string; view?: string; key?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version?.currentRevisionId) notFound();

  const [{ data: revision }, { data: auth }, basedOn] = await Promise.all([
    supabase.from("revisions").select("content").eq("id", version.currentRevisionId).maybeSingle(),
    supabase.auth.getUser(),
    loadBasedOn(supabase, version.forkedFromId),
  ]);
  if (!revision) notFound();

  const search = await searchParams;
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
    />
  );
}
