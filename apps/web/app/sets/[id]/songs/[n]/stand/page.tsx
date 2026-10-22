import { parse, type Chart } from "chartdown";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../../../lib/auth/enabled";
import { setSongKey } from "../../../../../../lib/sets/lineup";
import { songView, viewAs, viewsToSend, type SetSong } from "../../../../../../lib/sets/song";
import { guessPhone } from "../../../../../../lib/shell/guessPhone";
import { createClient } from "../../../../../../lib/supabase/server";
import { readDisplay } from "../../../../../versions/[id]/display";
import { UUID } from "../../../../../versions/[id]/load";
import { readSection } from "../../../../../versions/[id]/stand/standHref";
import { StandMode } from "../../../../../versions/[id]/stand/StandMode";
import { AudioButton } from "../../../../../_components/AudioDock";
import { saveAudioPoints } from "../../../../../versions/[id]/audio";
import { setRecording } from "../../../../../../lib/sets/recording";

type Search = Promise<{
  s?: string;
  view?: string;
  beats?: string;
  theme?: string;
  as?: string;
}>;

/**
 * Stand mode for a set's song (R-03.3, R-06.1 to R-06.6, T-802): the person's notes from
 * `set_song`, red dots where they have notes, and Previous and Next across the set's songs.
 * The MD and the set's temporary MD may view as any instrument (`?as=bass`).
 */
export default async function SetStandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id, n } = await params;
  const position = Number(n);
  if (!UUID.test(id) || !Number.isInteger(position) || position < 1) notFound();
  const supabase = await createClient();
  const [{ data, error }, { count }, { data: set }] = await Promise.all([
    supabase.rpc("set_song", { set_id: id, song_position: position }),
    supabase.from("set_items").select("id", { count: "exact", head: true }).eq("set_id", id),
    supabase.from("sets").select("band_id, type").eq("id", id).maybeSingle(),
  ]);
  if (error || !data || !set) notFound();
  const song = data as SetSong;
  const search = await searchParams;
  const total = count ?? position;

  // View as, for the MD and the temporary MD only.
  const leads = song.role !== "musician";
  const as = leads && search.as && /^[a-z0-9-]+$/.test(search.as) ? search.as : null;

  const chart = parse(song.content);
  const earlier = [...new Set(song.notes.map((note) => note.anchored_revision_id))].filter(
    (revisionId) => revisionId !== song.revision_id,
  );
  const { data: anchoredRows } = earlier.length
    ? await supabase.from("revisions").select("id, content").in("id", earlier)
    : { data: [] };
  const anchored = new Map<string, Chart>([[song.revision_id, chart]]);
  for (const row of anchoredRows ?? [])
    anchored.set(row.id as string, parse(row.content as string));

  const t = await getTranslations("sets");
  const s = await getTranslations("stand");
  const types = await getTranslations("sets.types");
  const instruments = await getTranslations("instruments");
  const nameOf = (slug: string) =>
    instruments.has(slug as "keys") ? instruments(slug as "keys") : slug;
  const barLabel = (bar: number) => t("bar", { bar });

  // The instruments playing in this set, for View as.
  let playing: string[] = [];
  if (leads) {
    const { data: lineup } = await supabase
      .from("set_lineup")
      .select("instrument:instruments(slug)")
      .eq("set_id", id);
    const { data: defaults } = (lineup ?? []).length
      ? { data: [] }
      : await supabase
          .from("member_instruments")
          .select("instrument:instruments(slug), member:band_members!inner(band_id)")
          .eq("member.band_id", set.band_id);
    playing = [...(lineup ?? []), ...(defaults ?? [])]
      .map((row) => {
        const instrument = (Array.isArray(row.instrument) ? row.instrument[0] : row.instrument) as {
          slug: string;
        } | null;
        return instrument?.slug ?? "";
      })
      .filter(Boolean);
  }
  const display = readDisplay(chart, { view: search.view, beats: search.beats });
  const homeKey = setSongKey(chart, song.set_key);
  const theme = search.theme === "stage" ? "stage" : "light";
  const keep: Record<string, string> = as ? { as } : {};
  const base = (n: number) => `/sets/${id}/songs/${n}/stand`;
  // The view, theme and View as travel with every link; the section only where it is given.
  const carry = (extra: Record<string, string>, viewing: Record<string, string> = keep) => {
    const query = new URLSearchParams({
      ...(display.style === "letters" ? { view: "letters" } : {}),
      ...(display.beats !== "auto" ? { beats: display.beats } : {}),
      ...(theme === "stage" ? { theme: "stage" } : {}),
      ...viewing,
      ...extra,
    }).toString();
    return query ? `?${query}` : "";
  };

  // The notes of each section as one View as shows them, filtered here on the server. The MD
  // gets every view at once, so switching is instant (F-006); a musician only their own.
  const notesFor = (slug: string | null) => {
    const view = songView(chart, viewAs(song, slug), (revisionId) => anchored.get(revisionId));
    return {
      notes: view.sections.map((notes) =>
        notes.map((note) => ({
          md: note.md,
          roles: note.roles,
          passes: note.passes,
          text: note.bar ? `${barLabel(note.bar)} · ${note.text}` : note.text,
        })),
      ),
      forYou: view.sections.map((notes) => notes.some((note) => note.forYou)),
    };
  };
  const shown = notesFor(as);
  // The band's recording plays in stand mode too, and the section follows it (R-06.7, T-2604).
  const recording = await setRecording(
    supabase,
    id,
    song.version_id,
    (await getTranslations("audio"))("personal"),
  );

  return (
    <StandMode
      versionId={song.version_id}
      title={song.title}
      content={song.content}
      section={readSection(chart, search.s)}
      style={display.style}
      homeKey={homeKey}
      beats={display.beats}
      theme={theme}
      path={base(position)}
      keep={keep}
      notes={shown.notes}
      forYou={shown.forYou}
      phone={await guessPhone()}
      {...(recording
        ? {
            audio: (
              <AudioButton
                recording={recording}
                chart={chart}
                save={
                  leads
                    ? saveAudioPoints.bind(null, recording.bandId, recording.versionId)
                    : undefined
                }
              />
            ),
          }
        : {})}
      set={{
        href: `/sets/${id}`,
        name: `${song.set_name} – ${types(set.type as "service")}`,
        songOf: t("songOf", { position, total }),
        ...(position > 1 ? { previousSong: `${base(position - 1)}${carry({ s: "999" })}` } : {}),
        ...(position < total ? { nextSong: `${base(position + 1)}${carry({})}` } : {}),
        ...(leads
          ? {
              viewAs: {
                label: as ? nameOf(as) : s("allNotes"),
                options: viewsToSend(song, playing).map((slug) => ({
                  label: slug ? nameOf(slug) : s("allNotes"),
                  href: `${base(position)}${carry({}, slug ? { as: slug } : {})}`,
                  current: (as ?? null) === slug,
                  as: slug,
                  ...notesFor(slug),
                })),
              },
            }
          : {}),
      }}
    />
  );
}
