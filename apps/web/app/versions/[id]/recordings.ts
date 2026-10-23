import { getTranslations } from "next-intl/server";
import type { createClient } from "../../../lib/supabase/server";
import type { BandRecording } from "./BandAudio";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The bands' recordings of a version as this person hears them (R-06.7): the database gives each
 * person their bands' only. With them, the bands this person arranges as their MD, whose
 * recordings they add, replace and remove. The version page and the chart editor (T-2834) read
 * them the same way.
 */
export async function loadRecordings(
  supabase: Supabase,
  versionId: string,
  userId: string,
): Promise<{ recordings: BandRecording[]; bands: { id: string; name: string }[] }> {
  const a = await getTranslations("audio");
  const bandName = (band: { name: string; is_personal: boolean } | null) =>
    band?.is_personal ? a("personal") : (band?.name ?? "");
  const [arranged, { data: rows }] = await Promise.all([
    bandsArranged(supabase, userId),
    supabase
      .from("band_audio")
      .select(
        "band_id, duration_ms, peaks, music_start_ms, music_end_ms, band:bands(name, is_personal)",
      )
      .eq("version_id", versionId),
  ]);
  const recordings = (rows ?? []).map((row) => {
    const band = (Array.isArray(row.band) ? row.band[0] : row.band) as {
      name: string;
      is_personal: boolean;
    } | null;
    return {
      bandId: row.band_id as string,
      band: bandName(band),
      durationMs: row.duration_ms as number,
      peaks: (row.peaks as number[] | null) ?? [],
      musicStartMs: row.music_start_ms as number,
      musicEndMs: (row.music_end_ms as number | null) ?? null,
      canArrange: arranged.some((one) => one.id === row.band_id),
    };
  });
  return {
    recordings,
    bands: arranged.map((band) => ({ id: band.id, name: bandName(band) })),
  };
}

/** The bands this person arranges as their MD, whose recordings they add (R-06.7). */
async function bandsArranged(
  supabase: Supabase,
  userId: string,
): Promise<{ id: string; name: string; is_personal: boolean }[]> {
  const { data } = await supabase
    .from("band_members")
    .select("band_id, band:bands(name, is_personal)")
    .eq("user_id", userId)
    .eq("role", "md");
  return (data ?? []).map((row) => {
    const band = (Array.isArray(row.band) ? row.band[0] : row.band) as {
      name: string;
      is_personal: boolean;
    } | null;
    return {
      id: row.band_id as string,
      name: band?.name ?? "",
      is_personal: band?.is_personal ?? false,
    };
  });
}
