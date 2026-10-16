import type { createClient } from "../../../lib/supabase/server";
import type { VersionSource } from "./VersionView";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LoadedVersion {
  id: string;
  songId: string;
  ownerId: string | null;
  author: string;
  currentRevisionId: string | null;
  forkedFromId: string | null;
  visibility: "public" | "private";
  status: "active" | "frozen" | "hidden";
  title: string;
  artists: string[];
  source: VersionSource;
  /** Where the music starts in the video, in seconds, when the owner saved it (R-03.11). */
  videoStart: number | null;
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
      "id, song_id, owner_id, author_name, forked_from_id, visibility, status, source_type, source_album, source_year, source_youtube_url, video_start_ms, current_revision_id, song:songs(title, artists)",
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
    songId: version.song_id,
    ownerId: version.owner_id,
    author: version.author_name,
    currentRevisionId: version.current_revision_id,
    forkedFromId: version.forked_from_id,
    visibility: version.visibility,
    status: version.status,
    title: song?.title ?? "",
    artists: song?.artists ?? [],
    source: {
      type: version.source_type,
      album: version.source_album,
      year: version.source_year,
      youtube: version.source_youtube_url,
    },
    videoStart: typeof version.video_start_ms === "number" ? version.video_start_ms / 1000 : null,
  };
}

/** What a fork is based on: the original and its author, or "unknown" if it can no longer be read. */
export type BasedOn = { id: string; author: string } | "unknown";

export async function loadBasedOn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  forkedFromId: string | null,
): Promise<BasedOn | null> {
  if (!forkedFromId) return null;
  const { data } = await supabase
    .from("versions")
    .select("id, author_name")
    .eq("id", forkedFromId)
    .maybeSingle();
  return data ? { id: data.id, author: data.author_name } : "unknown";
}
