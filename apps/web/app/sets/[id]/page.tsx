import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import { deleteSet, duplicateSet, moveItem, removeItem, updateSet } from "../actions";
import styles from "../sets.module.css";

type Search = Promise<Record<string, string | undefined>>;
type One<T> = T | T[] | null;
interface Item {
  id: string;
  position: number;
  set_key: string | null;
  version: One<{ id: string; author_name: string; song: One<{ title: string }> }>;
  revision: One<{ number: number }>;
}
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
const STATUS = ["created", "saved", "added", "moved", "removed", "duplicated"];
const ERRORS = new Set(["name", "date", "type", "name_taken", "confirm"]);

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
  const [{ data: me }, { data: rows }] = await Promise.all([
    supabase
      .from("band_members")
      .select("role")
      .eq("band_id", set.band_id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase
      .from("set_items")
      .select(
        "id, position, set_key, version:versions(id, author_name, song:songs(title)), revision:revisions(number)",
      )
      .eq("set_id", id)
      .order("position"),
  ]);
  const isMd = me?.role === "md";
  const items = (rows ?? []) as Item[];
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
                    <Link href={`/versions/${version?.id}`} className={styles.link}>
                      {title}
                    </Link>
                    <span className={styles.hint}>
                      {t("by", { author: version?.author_name ?? "" })} ·{" "}
                      {t("revision", { number: one(item.revision)?.number ?? 0 })}
                    </span>
                  </div>
                  {isMd && (
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
                      <form action={removeItem}>
                        {hidden(item.id)}
                        <Button type="submit" aria-label={t("removeName", { title })}>
                          {t("remove")}
                        </Button>
                      </form>
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
