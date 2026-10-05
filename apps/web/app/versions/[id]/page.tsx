import { parse } from "@chartdown/core";
import { notFound } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { loadVersion } from "./load";
import { VersionView } from "./VersionView";

/**
 * A version's public page (R-01.4): anyone reads a public version, with or without an account.
 * A version they may not read is a page not found. Its owner also finds the history (R-02.8).
 */
export default async function VersionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version?.currentRevisionId) notFound();

  const [{ data: revision }, { data: auth }] = await Promise.all([
    supabase.from("revisions").select("content").eq("id", version.currentRevisionId).maybeSingle(),
    supabase.auth.getUser(),
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
    />
  );
}
