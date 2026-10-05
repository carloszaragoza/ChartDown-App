import { parse } from "@chartdown/core";
import { notFound } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { VersionView, type VersionSource } from "./VersionView";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A version's public page (R-01.4): anyone reads a public version, with or without an account.
 * What the person may read is decided by the database's policies (Technical Plan 8.1); a version
 * they may not read is a page not found.
 */
export default async function VersionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: version } = await supabase
    .from("versions")
    .select(
      "id, author_name, source_type, source_album, source_year, source_youtube_url, current_revision_id, song:songs(title, artists)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!version?.current_revision_id) notFound();

  const [{ data: revision }, { data: auth }] = await Promise.all([
    supabase
      .from("revisions")
      .select("content")
      .eq("id", version.current_revision_id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!revision) notFound();

  const song = (Array.isArray(version.song) ? version.song[0] : version.song) as {
    title: string;
    artists: string[];
  } | null;
  const source: VersionSource = {
    type: version.source_type,
    album: version.source_album,
    year: version.source_year,
    youtube: version.source_youtube_url,
  };
  return (
    <VersionView
      id={version.id}
      title={song?.title ?? ""}
      artists={song?.artists ?? []}
      author={version.author_name}
      source={source}
      chart={parse(revision.content)}
      signedIn={Boolean(auth.user)}
    />
  );
}
