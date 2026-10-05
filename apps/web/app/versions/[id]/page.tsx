import { parse } from "@chartdown/core";
import { notFound } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
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
  searchParams: Promise<{ fork?: string }>;
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

  return (
    <VersionView
      id={version.id}
      title={version.title}
      artists={version.artists}
      author={version.author}
      source={version.source}
      chart={parse(revision.content)}
      signedIn={Boolean(auth.user)}
      owner={Boolean(auth.user) && auth.user?.id === version.ownerId}
      basedOn={basedOn}
      forkFailed={(await searchParams).fork === "failed"}
    />
  );
}
