import type { createClient } from "../../../lib/supabase/server";
import type { VersionSource } from "./VersionView";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LoadedVersion {
  id: string;
  ownerId: string | null;
  author: string;
  currentRevisionId: string | null;
  title: string;
  artists: string[];
  source: VersionSource;
}

/**
 * A version the person may read, or null. What they may read is decided by the database's
 * policies (Technical Plan 8.1).
 */
export async function loadVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<LoadedVersion | null> {
  if (!UUID.test(id)) return null;
  const { data: version } = await supabase
    .from("versions")
    .select(
      "id, owner_id, author_name, source_type, source_album, source_year, source_youtube_url, current_revision_id, song:songs(title, artists)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!version) return null;
  const song = (Array.isArray(version.song) ? version.song[0] : version.song) as {
    title: string;
    artists: string[];
  } | null;
  return {
    id: version.id,
    ownerId: version.owner_id,
    author: version.author_name,
    currentRevisionId: version.current_revision_id,
    title: song?.title ?? "",
    artists: song?.artists ?? [],
    source: {
      type: version.source_type,
      album: version.source_album,
      year: version.source_year,
      youtube: version.source_youtube_url,
    },
  };
}
