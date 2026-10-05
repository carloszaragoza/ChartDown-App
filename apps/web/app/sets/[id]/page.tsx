import { keyName, parse } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { effectiveLineup } from "../../../lib/sets/lineup";
import { createClient } from "../../../lib/supabase/server";
import { keysInMode } from "../../versions/[id]/display";
import { UUID } from "../../versions/[id]/load";
import {
  deleteSet,
  duplicateSet,
  moveItem,
  removeItem,
  resetLineup,
  saveLineup,
  setSongKey,
  updatePinned,
  updateSet,
} from "../actions";
import styles from "../sets.module.css";

type Search = Promise<Record<string, string | undefined>>;
type One<T> = T | T[] | null;
interface Item {
  id: string;
  position: number;
  set_key: string | null;
  version: One<{
    id: string;
    author_name: string;
    current_revision_id: string | null;
    song: One<{ title: string }>;
  }>;
  pinned_revision_id: string;
  revision: One<{ number: number; content: string }>;
}
interface Member {
  id: string;
  user_id: string;
  profile: One<{ name: string }>;
  instruments: { instrument_id: string }[];
}
interface CatalogInstrument {
  id: string;
  name_en: string;
  name_es: string;
  active: boolean;
}
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
const STATUS = [
  "created",
  "saved",
  "added",
  "moved",
  "removed",
  "duplicated",
  "lineup",
  "defaults",
  "key",
  "updated",
];
const ERRORS = new Set(["name", "date", "type", "name_taken", "confirm", "key"]);

/**
 * A set: its songs in order, each pinned to a revision (R-05.2). Members read it; the MD edits,
 * reorders, removes, duplicates and deletes it (R-05.1, R-05.6). The designed screen is T-706.
 */
export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: set } = await supabase
    .from("sets")
    .select("id, band_id, name, date, type, band:bands(name, is_personal)")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();
  const [
    { data: memberRows },
    { data: rows },
    { data: lineupRows },
    { data: tempMd },
    { data: catalog },
  ] = await Promise.all([
    supabase
      .from("band_members")
      .select(
        "id, user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
      )
      .eq("band_id", set.band_id)
      .order("joined_at"),
    supabase
      .from("set_items")
      .select(
        "id, position, set_key, pinned_revision_id, version:versions(id, author_name, current_revision_id, song:songs(title)), revision:revisions(number, content)",
      )
      .eq("set_id", id)
      .order("position"),
    supabase.from("set_lineup").select("member_id, instrument_id").eq("set_id", id),
    supabase.from("set_temp_md").select("member_id, until").eq("set_id", id).maybeSingle(),
    supabase.from("instruments").select("id, name_en, name_es, active"),
  ]);
  const members = (memberRows ?? []) as (Member & { role: "md" | "musician" })[];
  const me = members.find((member) => member.user_id === auth.user.id);
  const isMd = me?.role === "md";
  // The set's temporary MD edits its order, keys and lineup too (R-05.5, T-705).
  const today = new Date().toISOString().slice(0, 10);
  const isTempMd =
    Boolean(me && tempMd && tempMd.member_id === me.id) &&
    (!tempMd?.until || (tempMd.until as string) >= today);
  const canArrange = isMd || isTempMd;
  const items = (rows ?? []) as Item[];
  // Songs whose author has published a newer revision than the one pinned (decision 9.2).
  const newer = items.filter((item) => {
    const current = one(item.version)?.current_revision_id;
    return current && current !== item.pinned_revision_id;
  });
  const { data: currentRows } = newer.length
    ? await supabase
        .from("revisions")
        .select("id, number")
        .in(
          "id",
          newer.map((item) => one(item.version)?.current_revision_id as string),
        )
    : { data: [] };
  const currentNumber = new Map(
    (currentRows ?? []).map((row) => [row.id as string, row.number as number]),
  );
  const newerNumber = (item: Item) => {
    const current = one(item.version)?.current_revision_id;
    return current && current !== item.pinned_revision_id ? currentNumber.get(current) : undefined;
  };
  const charts = new Map(items.map((item) => [item.id, parse(one(item.revision)?.content ?? "")]));
  const written = (item: Item) => keyName(charts.get(item.id)?.key ?? { root: "C", minor: false });
  const minor = (item: Item) => Boolean(charts.get(item.id)?.key.minor);
  const ownLineup = (lineupRows ?? []).length > 0;
  const lineup = effectiveLineup(
    members.map((member) => ({
      id: member.id,
      defaults: member.instruments.map((row) => row.instrument_id),
    })),
    (lineupRows ?? []) as { member_id: string; instrument_id: string }[],
  );
  const lineupOf = (member: Member) => lineup.get(member.id) ?? [];
  const locale = await getLocale();
  const instruments = (catalog ?? []) as CatalogInstrument[];
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const nameById = new Map(instruments.map((instrument) => [instrument.id, nameOf(instrument)]));
  const profileName = (member: Member) => one(member.profile)?.name ?? "";
  const band = one(set.band as One<{ name: string; is_personal: boolean }>);
  const search = await searchParams;
  const status = STATUS.find((key) => search[key]);
  const t = await getTranslations("sets");
  const format = await getFormatter();
  const date = set.date
    ? format.dateTime(new Date(`${set.date}T00:00:00Z`), { dateStyle: "full", timeZone: "UTC" })
    : t("noDate");
  const hidden = (itemId?: string) => (
    <>
      <input type="hidden" name="setId" value={set.id} />
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
    </>
  );

  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.title}>{set.name}</h1>
        <p className={styles.hint}>
          {date} · {t(`types.${set.type}`)} · {band?.is_personal ? t("mySets") : band?.name}
        </p>
      </div>
      {status && (
        <p role="status" className={styles.message}>
          {t(`status.${status}`)}
        </p>
      )}
      {search.error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t(`errors.${ERRORS.has(search.error) ? search.error : "unknown"}`)}
        </p>
      )}

      <section aria-labelledby="songs" className={styles.list}>
        <h2 id="songs" className={styles.label}>
          {t("songs", { count: items.length })}
        </h2>
        {items.length === 0 ? (
          <p className={styles.hint}>{isMd ? t("emptyMd") : t("empty")}</p>
        ) : (
          <ol className={styles.items}>
            {items.map((item, index) => {
              const version = one(item.version);
              const title = one(version?.song ?? null)?.title ?? "";
              return (
                <li key={item.id} className={styles.song}>
                  <span className={styles.position}>{item.position}</span>
                  <div className={styles.songText}>
                    <Link href={`/sets/${set.id}/songs/${item.position}`} className={styles.link}>
                      {title}
                    </Link>
                    <span className={styles.hint}>
                      {t("by", { author: version?.author_name ?? "" })} ·{" "}
                      {t("revision", { number: one(item.revision)?.number ?? 0 })} ·{" "}
                      {item.set_key
                        ? t("inKey", { key: item.set_key, written: written(item) })
                        : t("writtenKey", { key: written(item) })}
                    </span>
                    {newerNumber(item) !== undefined && (
                      <div className={styles.update}>
                        <p className={styles.text}>
                          {t("newer", {
                            number: newerNumber(item) ?? 0,
                            pinned: one(item.revision)?.number ?? 0,
                          })}
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
                              {hidden(item.id)}
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
                    {canArrange && (
                      <form action={setSongKey} className={styles.keyForm}>
                        {hidden(item.id)}
                        <label className={styles.keyLabel}>
                          {t("keyFor", { title })}
                          <select
                            name="key"
                            defaultValue={item.set_key ?? ""}
                            className={styles.select}
                          >
                            <option value="">{t("keyWritten", { key: written(item) })}</option>
                            {keysInMode(minor(item)).map((key) => (
                              <option key={keyName(key)} value={keyName(key)}>
                                {keyName(key)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button type="submit">{t("keySave")}</Button>
                      </form>
                    )}
                  </div>
                  {canArrange && (
                    <div className={styles.buttons}>
                      {index > 0 && (
                        <form action={moveItem}>
                          {hidden(item.id)}
                          <input type="hidden" name="position" value={item.position - 1} />
                          <Button type="submit" aria-label={t("upName", { title })}>
                            {t("up")}
                          </Button>
                        </form>
                      )}
                      {index < items.length - 1 && (
                        <form action={moveItem}>
                          {hidden(item.id)}
                          <input type="hidden" name="position" value={item.position + 1} />
                          <Button type="submit" aria-label={t("downName", { title })}>
                            {t("down")}
                          </Button>
                        </form>
                      )}
                      {isMd && (
                        <form action={removeItem}>
                          {hidden(item.id)}
                          <Button type="submit" aria-label={t("removeName", { title })}>
                            {t("remove")}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {isMd && (
          <p className={styles.hint}>
            {t("addHint")}{" "}
            <Link href="/catalog" className={styles.link}>
              {t("catalog")}
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="lineup" className={styles.list}>
        <h2 id="lineup" className={styles.label}>
          {t("lineup")}
        </h2>
        <p className={styles.hint}>{ownLineup ? t("lineupOwn") : t("lineupDefaults")}</p>
        {canArrange ? (
          <form action={saveLineup} className={styles.form}>
            {hidden()}
            {members.map((member) => {
              const plays = new Set(lineupOf(member));
              return (
                <fieldset key={member.id} className={styles.group}>
                  <legend className={styles.label}>{profileName(member)}</legend>
                  <input type="hidden" name="member" value={member.id} />
                  <div className={styles.instruments}>
                    {instruments
                      .filter((instrument) => instrument.active || plays.has(instrument.id))
                      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale))
                      .map((instrument) => (
                        <label key={instrument.id} className={styles.check}>
                          <input
                            type="checkbox"
                            name={`instrument-${member.id}`}
                            value={instrument.id}
                            defaultChecked={plays.has(instrument.id)}
                          />
                          {nameOf(instrument)}
                        </label>
                      ))}
                  </div>
                </fieldset>
              );
            })}
            <div className={styles.buttons}>
              <Button type="submit" variant="primary">
                {t("lineupSave")}
              </Button>
            </div>
          </form>
        ) : (
          <ul className={styles.items}>
            {members.map((member) => {
              const plays = lineupOf(member).map(
                (instrumentId) => nameById.get(instrumentId) ?? "",
              );
              return (
                <li key={member.id} className={styles.row}>
                  <span className={styles.text}>{profileName(member)}</span>
                  <span className={styles.hint}>
                    {plays.length > 0 ? plays.join(", ") : t("sitsOut")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {canArrange && ownLineup && (
          <form action={resetLineup}>
            {hidden()}
            <Button type="submit">{t("lineupReset")}</Button>
          </form>
        )}
      </section>

      {isMd && (
        <>
          <form action={updateSet} className={styles.form}>
            <h2 className={styles.label}>{t("edit")}</h2>
            {hidden()}
            <label className={styles.field}>
              {t("name")}
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={set.name}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              {t("date")}
              <input
                name="date"
                type="date"
                defaultValue={set.date ?? ""}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              {t("type")}
              <select name="type" defaultValue={set.type} className={styles.input}>
                {(["rehearsal", "service", "concert"] as const).map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">{t("save")}</Button>
          </form>

          <form action={duplicateSet} className={styles.form}>
            <h2 className={styles.label}>{t("duplicate")}</h2>
            {hidden()}
            <label className={styles.field}>
              {t("newName")}
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={t("copyName", { name: set.name })}
                className={styles.input}
              />
            </label>
            <p className={styles.hint}>{t("duplicateHint")}</p>
            <Button type="submit">{t("duplicateButton")}</Button>
          </form>

          <form action={deleteSet} className={styles.form}>
            <h2 className={styles.label}>{t("delete")}</h2>
            {hidden()}
            <input type="hidden" name="bandId" value={set.band_id} />
            <label className={styles.check}>
              <input type="checkbox" name="confirm" value="yes" required />
              {t("deleteConfirm")}
            </label>
            <Button type="submit">{t("deleteButton")}</Button>
          </form>
        </>
      )}
      <Link href={`/bands/${set.band_id}/sets`} className={styles.back}>
        {band?.is_personal ? t("backToMySets") : t("backToSets", { band: band?.name ?? "" })}
      </Link>
    </main>
  );
}
