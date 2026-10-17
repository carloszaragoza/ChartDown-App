import type { createClient } from "../supabase/server";

/**
 * The set's band's recording of a song (R-06.7), as the player takes it, or null: the database
 * gives it to the band's members only.
 */
export async function setRecording(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setId: string,
  versionId: string,
  personal: string,
) {
  const { data: set } = await supabase
    .from("sets")
    .select("band_id, band:bands(name, is_personal)")
    .eq("id", setId)
    .maybeSingle();
  if (!set) return null;
  const { data: row } = await supabase
    .from("band_audio")
    .select("duration_ms, peaks, music_start_ms")
    .match({ band_id: set.band_id, version_id: versionId })
    .maybeSingle();
  if (!row) return null;
  const band = (Array.isArray(set.band) ? set.band[0] : set.band) as {
    name: string;
    is_personal: boolean;
  } | null;
  return {
    bandId: set.band_id as string,
    versionId,
    band: band?.is_personal ? personal : (band?.name ?? ""),
    durationMs: row.duration_ms as number,
    peaks: (row.peaks as number[] | null) ?? [],
    musicStartMs: row.music_start_ms as number,
  };
}
