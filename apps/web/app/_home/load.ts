import { keyName, parse } from "chartdown";
import type { createClient } from "../../lib/supabase/server";
import { setSongKey } from "../../lib/sets/lineup";
import { songView, type SetSong } from "../../lib/sets/song";
import { localToday } from "../../lib/sets/today";
import { compareSets, nextSet } from "../../lib/sets/when";
import { currentBand } from "../../lib/shell/shell";

type Client = Awaited<ReturnType<typeof createClient>>;
type One<T> = T | T[] | null;
const one = <T>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

export type UsagePeriod = 7 | 30 | null;

export interface HomeData {
  name: string;
  admin: boolean;
  variant: "md" | "musician" | "new";
  band: { id: string; name: string; personal: boolean; role: "md" | "musician" } | null;
  personalId: string | null;
  instruments: { slug: string; name: string }[];
  bands: number;
  upcoming: number;
  next: {
    id: string;
    name: string;
    type: "rehearsal" | "service" | "concert";
    band: string;
    date: string | null;
    time: string | null;
    songs: { title: string; key: string }[];
    notesForYou: number;
    plays: string[];
  } | null;
  versions: { public: number; private: number };
  members: { name: string; instruments: string[]; you: boolean; md: boolean }[];
  usage: {
    total: { bands: number; musicians: number } | null;
    rows: {
      id: string;
      title: string;
      sourceType: string;
      year: number | null;
      bands: number;
      musicians: number;
    }[];
  };
  attention: {
    newer: { songs: number; set: string; setId: string } | null;
    pending: { count: number; band: string; bandId: string } | null;
    reports: number;
    notes: number;
    keys: number;
  };
  steps: { instruments: boolean; band: boolean; version: boolean; set: boolean };
  recent: {
    id: string;
    type: string;
    detail: Record<string, unknown>;
    created_at: string;
    read_at: string | null;
  }[];
}

/**
 * Which Home a person gets (Design Handoff 2.0 screen 00), from their data, never a setting: new
 * with no band but the personal space and no version; music director of the current band; or
 * musician.
 */
export function homeVariant(person: {
  bands: number;
  versions: number;
  directsCurrentBand: boolean;
}): HomeData["variant"] {
  if (person.bands === 0 && person.versions === 0) return "new";
  return person.directsCurrentBand ? "md" : "musician";
}

/**
 * What Home shows a signed-in person (T-1308; Design Handoff 2.0 screen 00), read with their own
 * permissions; the usage of their public versions comes from `version_usage` (R-02.11).
 */
export async function loadHome(
  supabase: Client,
  userId: string,
  options: { chosenBand: string | undefined; usage: UsagePeriod; locale: string },
): Promise<HomeData> {
  const today = await localToday();
  const nameIn = (row: { name_en: string; name_es: string }) =>
    options.locale === "es" ? row.name_es : row.name_en;
  const [
    { data: profile },
    { data: memberships },
    { data: mine },
    { data: setRows },
    { data: versionRows },
    { data: recent },
    { data: unread },
  ] = await Promise.all([
    supabase.from("profiles").select("name, role").eq("id", userId).maybeSingle(),
    supabase
      .from("band_members")
      .select("role, band:bands(id, name, is_personal)")
      .eq("user_id", userId),
    supabase
      .from("user_instruments")
      .select("instrument:instruments(slug, name_en, name_es)")
      .eq("user_id", userId),
    supabase.from("sets").select("id, band_id, name, date, time, type"),
    supabase
      .from("versions")
      .select("id, visibility, status, source_type, source_year, song:songs(title)")
      .eq("owner_id", userId),
    supabase
      .from("notifications")
      .select("id, type, detail, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .is("read_at", null)
      .in("type", ["note_added", "key_changed"]),
  ]);

  type Band = { id: string; name: string; is_personal: boolean };
  const rows = (memberships ?? []).flatMap((row) => {
    const band = one(row.band as One<Band>);
    return band ? [{ role: row.role as "md" | "musician", band }] : [];
  });
  const shellBands = rows.map(({ band }) => ({
    id: band.id,
    name: band.name,
    personal: band.is_personal,
  }));
  const chosen = currentBand(shellBands, options.chosenBand);
  const chosenRow = rows.find((row) => row.band.id === chosen?.id) ?? null;
  const personalId = rows.find((row) => row.band.is_personal)?.band.id ?? null;
  const realBands = rows.filter((row) => !row.band.is_personal);
  const mdBands = realBands.filter((row) => row.role === "md").map((row) => row.band);

  const instruments = (mine ?? []).flatMap((row) => {
    const instrument = one(
      (row as { instrument: One<{ slug: string; name_en: string; name_es: string }> }).instrument,
    );
    return instrument ? [{ slug: instrument.slug, name: nameIn(instrument) }] : [];
  });
  type SetRow = {
    id: string;
    band_id: string;
    name: string;
    date: string | null;
    time: string | null;
    type: "rehearsal" | "service" | "concert";
  };
  const sets = (setRows ?? []) as SetRow[];
  const upcomingSets = sets.filter((set) => !set.date || set.date >= today).sort(compareSets);
  const nextRow = nextSet(sets, today);
  type VersionRow = {
    id: string;
    visibility: "public" | "private";
    status: "active" | "frozen" | "hidden";
    source_type: string;
    source_year: number | null;
    song: One<{ title: string }>;
  };
  const versions = (versionRows ?? []) as VersionRow[];
  const publicVersions = versions.filter(
    (version) => version.visibility === "public" && version.status !== "hidden",
  );

  // The next set: its songs as this person plays them, and the notes for them (set_song).
  let next: HomeData["next"] = null;
  if (nextRow) {
    const { count } = await supabase
      .from("set_items")
      .select("id", { count: "exact", head: true })
      .eq("set_id", nextRow.id);
    const songs = await Promise.all(
      Array.from({ length: count ?? 0 }, (_, index) =>
        supabase
          .rpc("set_song", { set_id: nextRow.id, song_position: index + 1 })
          .then(({ data }) => (data as SetSong | null) ?? null),
      ),
    );
    const read = songs.flatMap((song) => {
      if (!song) return [];
      const chart = parse(song.content);
      return [
        {
          title: song.title,
          key: keyName(setSongKey(chart, song.set_key)),
          forYou: songView(chart, song).forYou,
          plays: song.instruments,
        },
      ];
    });
    next = {
      id: nextRow.id,
      name: nextRow.name,
      type: nextRow.type,
      band: rows.find((row) => row.band.id === nextRow.band_id)?.band.name ?? "",
      date: nextRow.date,
      time: nextRow.time,
      songs: read.map(({ title, key }) => ({ title, key })),
      notesForYou: read.reduce((sum, song) => sum + song.forYou, 0),
      plays: read[0]?.plays ?? [],
    };
  }

  // The current band's members, their default instruments in it.
  let members: HomeData["members"] = [];
  if (chosenRow && !chosenRow.band.is_personal) {
    const [{ data: memberRows }, { data: catalog }] = await Promise.all([
      supabase
        .from("band_members")
        .select(
          "user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
        )
        .eq("band_id", chosenRow.band.id)
        .order("joined_at"),
      supabase.from("instruments").select("id, name_en, name_es"),
    ]);
    const names = new Map((catalog ?? []).map((row) => [row.id as string, nameIn(row)]));
    members = (memberRows ?? []).map((row) => ({
      name: one(row.profile as One<{ name: string }>)?.name ?? "",
      instruments: ((row.instruments ?? []) as { instrument_id: string }[]).map(
        (item) => names.get(item.instrument_id) ?? "",
      ),
      you: row.user_id === userId,
      md: row.role === "md",
    }));
  }

  // What needs the person: newer revisions and pending invitations in the bands they direct,
  // open reports for admins, and unread notices about their notes and keys.
  const admin = profile?.role === "admin";
  const mdIds = mdBands.map((band) => band.id);
  const mdUpcoming = upcomingSets.filter((set) => mdIds.includes(set.band_id));
  const [{ data: items }, { data: pending }, { count: reports }, { data: usageRows }] =
    await Promise.all([
      mdUpcoming.length
        ? supabase
            .from("set_items")
            .select("set_id, pinned_revision_id, version:versions(current_revision_id)")
            .in(
              "set_id",
              mdUpcoming.map((set) => set.id),
            )
        : Promise.resolve({ data: [] }),
      mdIds.length
        ? supabase
            .from("band_invitations")
            .select("band_id")
            .in("band_id", mdIds)
            .is("responded_at", null)
        : Promise.resolve({ data: [] }),
      admin
        ? supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")
        : Promise.resolve({ count: 0 }),
      publicVersions.length
        ? supabase.rpc("version_usage", { days: options.usage })
        : Promise.resolve({ data: [] }),
    ]);
  const stale = (items ?? []).filter((item) => {
    const current = one(
      item.version as One<{ current_revision_id: string | null }>,
    )?.current_revision_id;
    return current && current !== item.pinned_revision_id;
  });
  const staleSet = mdUpcoming.find((set) => stale.some((item) => item.set_id === set.id));
  const pendingRows = (pending ?? []) as { band_id: string }[];
  const pendingBand = mdBands.find((band) => pendingRows.some((row) => row.band_id === band.id));
  const unreadRows = (unread ?? []) as { type: string }[];

  type Usage = { version_id: string | null; bands: number; musicians: number };
  const usage = (usageRows ?? []) as Usage[];
  const byId = new Map(versions.map((version) => [version.id, version]));
  const usageTotal = usage.find((row) => row.version_id === null);

  const variant = homeVariant({
    bands: realBands.length,
    versions: versions.length,
    directsCurrentBand: chosenRow?.role === "md" && !chosenRow.band.is_personal,
  });

  return {
    name: profile?.name ?? "",
    admin,
    variant,
    band: chosenRow
      ? {
          id: chosenRow.band.id,
          name: chosenRow.band.name,
          personal: chosenRow.band.is_personal,
          role: chosenRow.role,
        }
      : null,
    personalId,
    instruments,
    bands: rows.length,
    upcoming: upcomingSets.length,
    next,
    versions: {
      public: publicVersions.length,
      private: versions.filter((version) => version.visibility === "private").length,
    },
    members,
    usage: {
      total: usageTotal ? { bands: usageTotal.bands, musicians: usageTotal.musicians } : null,
      rows: usage
        .flatMap((row) => {
          const version = row.version_id ? byId.get(row.version_id) : undefined;
          return version
            ? [
                {
                  id: version.id,
                  title: one(version.song)?.title ?? "",
                  sourceType: version.source_type,
                  year: version.source_year,
                  bands: row.bands,
                  musicians: row.musicians,
                },
              ]
            : [];
        })
        .sort((a, b) => b.musicians - a.musicians || a.title.localeCompare(b.title)),
    },
    attention: {
      newer: staleSet
        ? {
            songs: stale.filter((item) => item.set_id === staleSet.id).length,
            set: staleSet.name,
            setId: staleSet.id,
          }
        : null,
      pending: pendingBand
        ? {
            count: pendingRows.filter((row) => row.band_id === pendingBand.id).length,
            band: pendingBand.name,
            bandId: pendingBand.id,
          }
        : null,
      reports: reports ?? 0,
      notes: unreadRows.filter((row) => row.type === "note_added").length,
      keys: unreadRows.filter((row) => row.type === "key_changed").length,
    },
    steps: {
      instruments: instruments.length > 0,
      band: realBands.length > 0,
      version: versions.length > 0,
      set: sets.length > 0,
    },
    recent: (recent ?? []) as HomeData["recent"],
  };
}
