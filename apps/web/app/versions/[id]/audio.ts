"use server";

import { authEnabled } from "../../../lib/auth/enabled";
import { MAX_AUDIO_BYTES, PEAK_COUNT } from "../../../lib/audio/file";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "./load";

const TYPES = ["audio/mpeg", "audio/mp4"];

/**
 * Records the band's recording of a version once its file is uploaded (R-06.7, T-2602), in place
 * of any it had. The database's policies take it only from the band's MD (or a temporary MD of a
 * set with the version). True when it was recorded.
 */
export async function recordAudio(input: {
  bandId: string;
  versionId: string;
  size: number;
  durationMs: number;
  contentType: string;
  peaks: number[];
}): Promise<boolean> {
  if (!authEnabled() || !UUID.test(input.bandId) || !UUID.test(input.versionId)) return false;
  if (!(input.size > 0 && input.size <= MAX_AUDIO_BYTES)) return false;
  if (!(input.durationMs > 0 && input.durationMs <= 3_600_000)) return false;
  if (!TYPES.includes(input.contentType)) return false;
  const peaks = input.peaks
    .slice(0, PEAK_COUNT)
    .map((peak) => Math.min(1000, Math.max(0, Math.round(peak))));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const where = { band_id: input.bandId, version_id: input.versionId };
  await supabase.from("band_audio").delete().match(where);
  const { error } = await supabase.from("band_audio").insert({
    ...where,
    path: `${input.bandId}/${input.versionId}`,
    size_bytes: input.size,
    duration_ms: Math.round(input.durationMs),
    content_type: input.contentType,
    peaks,
    added_by: auth.user.id,
  });
  return !error;
}

/** Removes the band's recording of a version, its file too (R-06.7). True when removed. */
export async function removeAudio(bandId: string, versionId: string): Promise<boolean> {
  if (!authEnabled() || !UUID.test(bandId) || !UUID.test(versionId)) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_audio")
    .delete()
    .match({ band_id: bandId, version_id: versionId })
    .select("id");
  if (error || data?.length !== 1) return false;
  await supabase.storage.from("band-audio").remove([`${bandId}/${versionId}`]);
  return true;
}

/** Saves where the music starts in the band's recording, for the band (R-06.7). */
export async function saveAudioStart(
  bandId: string,
  versionId: string,
  milliseconds: number,
): Promise<boolean> {
  if (!authEnabled() || !UUID.test(bandId) || !UUID.test(versionId)) return false;
  const value = Math.round(milliseconds);
  if (!Number.isFinite(value) || value < 0 || value > 3_600_000) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("band_audio")
    .update({ music_start_ms: value })
    .match({ band_id: bandId, version_id: versionId })
    .select("id");
  return !error && data?.length === 1;
}
