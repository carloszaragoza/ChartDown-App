import { parse } from "chartdown";
import { Banner } from "@astryxdesign/core/Banner";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { guessPhone } from "../../../lib/shell/guessPhone";
import { createClient, readUser } from "../../../lib/supabase/server";
import { readDisplay } from "./display";
import { loadBasedOn, loadVersion } from "./load";
import { VersionView, type SetChoice } from "./VersionView";

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
  searchParams: Promise<{
    fork?: string;
    view?: string;
    key?: string;
    beats?: string;
    report?: string;
    saved?: string;
  }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version?.currentRevisionId) notFound();

  const [{ data: revision }, { data: auth }, basedOn] = await Promise.all([
    supabase.from("revisions").select("content").eq("id", version.currentRevisionId).maybeSingle(),
    readUser(supabase),
    loadBasedOn(supabase, version.forkedFromId),
  ]);
  if (!revision) notFound();

  const search = await searchParams;
  const { sets: setChoices, bands: setBands } = auth.user
    ? await mySets(supabase, auth.user.id)
    : { sets: [], bands: [] };
  // The bands' recordings of this version: the database gives each person their bands' only.
  const a = await getTranslations("audio");
  const arranged = auth.user ? await bandsArranged(supabase, auth.user.id) : [];
  const bandName = (band: { name: string; is_personal: boolean } | null) =>
    band?.is_personal ? a("personal") : (band?.name ?? "");
  const { data: audioRows } = auth.user
    ? await supabase
        .from("band_audio")
        .select("band_id, duration_ms, peaks, music_start_ms, band:bands(name, is_personal)")
        .eq("version_id", version.id)
    : { data: [] };
  const recordings = (audioRows ?? []).map((row) => {
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
      canArrange: arranged.some((one) => one.id === row.band_id),
    };
  });
  const chart = parse(revision.content);
  // Back from the editor after a save (T-2404): the new revision is said once, here.
  const saved = /^\d+$/.test(search.saved ?? "") ? Number(search.saved) : null;
  const e = await getTranslations("editor");
  return (
    <VersionView
      id={version.id}
      songId={version.songId}
      videoStart={version.videoStart}
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
      report={
        search.report === "open" ||
        search.report === "sent" ||
        search.report === "already" ||
        search.report === "failed"
          ? search.report
          : null
      }
      setChoices={setChoices}
      setBands={setBands}
      phone={await guessPhone()}
      {...(auth.user
        ? {
            audio: {
              recordings,
              bands: arranged.map((band) => ({ id: band.id, name: bandName(band) })),
            },
          }
        : {})}
      {...(saved !== null
        ? {
            message: (
              <div role="status">
                <Banner status="success" title={e("saved", { number: saved })} />
              </div>
            ),
          }
        : {})}
    />
  );
}

/**
 * The sets of the bands where this person is the MD, to add the version to (R-05.2), and those
 * bands, to start a new set in (T-2807).
 */
async function mySets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ sets: SetChoice[]; bands: { id: string; name: string | null }[] }> {
  const { data: bands } = await supabase
    .from("band_members")
    .select("band_id, band:bands(name, is_personal)")
    .eq("user_id", userId)
    .eq("role", "md");
  const names = new Map(
    (bands ?? []).map((row) => {
      const band = (Array.isArray(row.band) ? row.band[0] : row.band) as {
        name: string;
        is_personal: boolean;
      } | null;
      return [row.band_id as string, band?.is_personal ? null : (band?.name ?? "")];
    }),
  );
  const arranged = [...names].map(([id, name]) => ({ id, name }));
  if (names.size === 0) return { sets: [], bands: arranged };
  const { data: sets } = await supabase
    .from("sets")
    .select("id, band_id, name, date")
    .in("band_id", [...names.keys()])
    .order("date", { ascending: true, nullsFirst: false });
  return {
    sets: (sets ?? []).map((set) => ({
      id: set.id as string,
      band: names.get(set.band_id as string) ?? null,
      name: set.name as string,
    })),
    bands: arranged,
  };
}

/** The bands this person arranges as their MD, whose recordings they add (R-06.7). */
async function bandsArranged(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
