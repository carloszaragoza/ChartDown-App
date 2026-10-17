import { NextResponse } from "next/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { createClient } from "../../../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A set's bundle for the person asking, to keep on their device (R-08.1, T-902). It runs with
 * their session, so it holds only what they may see; nothing outside the band gets anything.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!authEnabled() || !UUID.test(id)) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_bundle", { set_id: id });
  if (error || !data) return new NextResponse(null, { status: 404 });
  // The band's recordings of the set's songs (R-06.7), kept with the set for stand mode offline.
  const songs = (data as { songs?: { version_id: string }[] }).songs ?? [];
  const { data: set } = await supabase
    .from("sets")
    .select("band_id, band:bands(name, is_personal)")
    .eq("id", id)
    .maybeSingle();
  const { data: rows } =
    set && songs.length > 0
      ? await supabase
          .from("band_audio")
          .select("version_id, duration_ms, peaks, music_start_ms, added_at")
          .eq("band_id", set.band_id)
          .in(
            "version_id",
            songs.map((song) => song.version_id),
          )
      : { data: [] };
  const audio = (rows ?? []).map((row) => ({
    bandId: set?.band_id as string,
    versionId: row.version_id as string,
    durationMs: row.duration_ms as number,
    peaks: (row.peaks as number[] | null) ?? [],
    musicStartMs: row.music_start_ms as number,
    addedAt: row.added_at as string,
  }));
  return NextResponse.json(
    { ...(data as object), audio },
    { headers: { "Cache-Control": "no-store" } },
  );
}
