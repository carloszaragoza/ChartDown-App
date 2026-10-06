import { keyName, parse } from "@chartdown/core";
import { Button, InstrumentTag } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { effectiveLineup, setSongKey } from "../../../lib/sets/lineup";
import { songView, type SetSong } from "../../../lib/sets/song";
import { setWhen } from "../../../lib/sets/when";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import { updatePinned } from "../actions";
import styles from "../sets.module.css";

type One<T> = T | T[] | null;
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
interface Item {
  id: string;
  position: number;
  pinned_revision_id: string;
  revision: One<{ number: number }>;
  version: One<{
    id: string;
    current_revision_id: string | null;
    source_type: "studio" | "live" | "acoustic" | "own_arrangement";
    source_year: number | null;
    song: One<{ title: string }>;
  }>;
}
interface Member {
  id: string;
  user_id: string;
  role: "md" | "musician";
  profile: One<{ name: string }>;
  instruments: { instrument_id: string }[];
}
interface CatalogInstrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
}

/**
 * A set as a musician reads it (T-706, `design/screens/01-set.html`): its songs in order with
 * their source, key and the notes for this person, counted by `set_song` so no other note is
 * counted (R-06.2), and the lineup. Those who arrange it go to “Edit set”.
 */
export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: set } = await supabase
    .from("sets")
    .select("id, band_id, name, date, time, type, band:bands(name, is_personal)")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();

  const [
    { data: itemRows },
    { data: memberRows },
    { data: lineupRows },
    { data: tempMd },
    { data: catalog },
  ] = await Promise.all([
    supabase
      .from("set_items")
      .select(
        "id, position, pinned_revision_id, revision:revisions(number), version:versions(id, current_revision_id, source_type, source_year, song:songs(title))",
      )
      .eq("set_id", id)
      .order("position"),
    supabase
      .from("band_members")
      .select(
        "id, user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
      )
      .eq("band_id", set.band_id)
      .order("joined_at"),
    supabase.from("set_lineup").select("member_id, instrument_id").eq("set_id", id),
    supabase.from("set_temp_md").select("member_id, until").eq("set_id", id).maybeSingle(),
    supabase.from("instruments").select("id, slug, name_en, name_es"),
  ]);
  const items = (itemRows ?? []) as Item[];
  const members = (memberRows ?? []) as Member[];
  const me = members.find((member) => member.user_id === auth.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const isTempMd =
    Boolean(me && tempMd && tempMd.member_id === me.id) &&
    (!tempMd?.until || (tempMd.until as string) >= today);
  const isMd = me?.role === "md";
  const canArrange = isMd || isTempMd;

  // Each song as this person may see it: the key it is played in and the notes for them.
  const songs = await Promise.all(
    items.map(async (item) => {
      const { data } = await supabase.rpc("set_song", {
        set_id: id,
        song_position: item.position,
      });
      if (!data) return null;
      const song = data as SetSong;
      const chart = parse(song.content);
      return {
        key: keyName(setSongKey(chart, song.set_key)),
        notes: songView(chart, song).forYou,
        leads: song.role !== "musician",
      };
    }),
  );
  // Songs whose author published a newer revision than the one pinned (decision 9.2).
  const newerIds = items
    .map((item) => one(item.version)?.current_revision_id)
    .filter((current, index): current is string =>
      Boolean(current && current !== items[index]?.pinned_revision_id),
    );
  const { data: newerRows } = newerIds.length
    ? await supabase.from("revisions").select("id, number").in("id", newerIds)
    : { data: [] };
  const newerNumber = new Map(
    (newerRows ?? []).map((row) => [row.id as string, row.number as number]),
  );

  const locale = await getLocale();
  const instruments = (catalog ?? []) as CatalogInstrument[];
  const byId = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const nameOf = (instrument: CatalogInstrument | undefined) =>
    instrument ? (locale === "es" ? instrument.name_es : instrument.name_en) : "";
  const lineup = effectiveLineup(
    members.map((member) => ({
      id: member.id,
      defaults: member.instruments.map((row) => row.instrument_id),
    })),
    (lineupRows ?? []) as { member_id: string; instrument_id: string }[],
  );

  const t = await getTranslations("sets");
  const sources = await getTranslations("version.source");
  const format = await getFormatter();
  const search = await searchParams;
  const band = one(set.band as One<{ name: string; is_personal: boolean }>);
  const when = setWhen(format, set.date, set.time as string | null, "full");
  const facts = [when, t("songs", { count: items.length })].filter(Boolean).join(" · ");
  const status = search.created ? t("status.created") : search.updated ? t("status.updated") : null;

  return (
    <main className={styles.wide}>
      <div className={styles.setHeader}>
        <div>
          <p className={styles.hint}>
            <Link href={`/bands/${set.band_id}/sets`} className={styles.crumb}>
              {band?.is_personal ? t("mySets") : band?.name}
            </Link>{" "}
            · {t(`types.${set.type}`)}
          </p>
          <h1 className={styles.title}>{set.name}</h1>
          <p className={styles.meta}>{facts}</p>
        </div>
        <div className={styles.buttons}>
          {canArrange && (
            <Link href={`/sets/${set.id}/edit`} className="cd-button cd-button--secondary">
              {t("editSet")}
            </Link>
          )}
          {items.length > 0 && (
            <Link href={`/sets/${set.id}/songs/1/stand`} className="cd-button cd-button--primary">
              {t("startStand")}
            </Link>
          )}
        </div>
      </div>
      {status && (
        <p role="status" className={styles.message}>
          {status}
        </p>
      )}
      {search.error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t("errors.unknown")}
        </p>
      )}

      <div className={styles.columns}>
        <section aria-labelledby="songs" className={styles.card}>
          <h2 id="songs" className={styles.cardTitle}>
            {t("songsTitle")}
          </h2>
          {items.length === 0 ? (
            <p className={styles.hint}>{canArrange ? t("emptyMd") : t("empty")}</p>
          ) : (
            <ol className={styles.songList}>
              {items.map((item, index) => {
                const version = one(item.version);
                const title = one(version?.song ?? null)?.title ?? "";
                const shown = songs[index];
                const newer = version?.current_revision_id
                  ? newerNumber.get(version.current_revision_id)
                  : undefined;
                return (
                  <li key={item.id} className={styles.songRow}>
                    <span className={styles.position}>{item.position}</span>
                    <div className={styles.songText}>
                      <Link
                        href={`/sets/${set.id}/songs/${item.position}`}
                        className={styles.songTitle}
                      >
                        {title}
                      </Link>
                      <span className={styles.hint}>
                        {[version && sources(version.source_type), version?.source_year]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                      {newer !== undefined && (
                        <div className={styles.update}>
                          <p className={styles.text}>
                            {t("newer", { number: newer, pinned: one(item.revision)?.number ?? 0 })}
                          </p>
                          {isMd && (
                            <div className={styles.buttons}>
                              <Link
                                href={`/sets/${set.id}/songs/${item.position}?preview=new`}
                                className="cd-button cd-button--secondary"
                                aria-label={t("seeNewerName", { title })}
                              >
                                {t("seeNewer")}
                              </Link>
                              <form action={updatePinned}>
                                <input type="hidden" name="setId" value={set.id} />
                                <input type="hidden" name="itemId" value={item.id} />
                                <Button
                                  type="submit"
                                  variant="primary"
                                  aria-label={t("updateName", { title })}
                                >
                                  {t("update")}
                                </Button>
                              </form>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={styles.songKey}>
                      {t("key")} <b>{shown?.key ?? ""}</b>
                    </span>
                    <span className={shown && shown.notes > 0 ? styles.forYou : styles.noNotes}>
                      {shown && shown.notes > 0
                        ? shown.leads
                          ? t("notesCount", { count: shown.notes })
                          : t("forYouCount", { count: shown.notes })
                        : t("noNotes")}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="lineup" className={styles.card}>
          <h2 id="lineup" className={styles.cardTitle}>
            {t("lineup")}
          </h2>
          <ul className={styles.lineupList}>
            {members.map((member) => {
              const plays = (lineup.get(member.id) ?? []).map((instrumentId) =>
                byId.get(instrumentId),
              );
              const first = plays[0];
              const name = one(member.profile)?.name ?? "";
              const role = [
                member.role === "md" ? t("mdShort") : null,
                plays.length > 0 ? plays.map(nameOf).join(", ") : t("sitsOut"),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={member.id} className={styles.lineupRow}>
                  <span className={styles.lineupIcon}>
                    {first && (
                      <InstrumentTag
                        instrument={first.slug}
                        label={nameOf(first)}
                        variant="compact"
                      />
                    )}
                  </span>
                  <span className={styles.songText}>
                    <b>{member.user_id === auth.user.id ? t("you", { name }) : name}</b>
                    <span className={styles.hint}>{role}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={styles.hint}>{t("lineupNote")}</p>
        </section>
      </div>
    </main>
  );
}
