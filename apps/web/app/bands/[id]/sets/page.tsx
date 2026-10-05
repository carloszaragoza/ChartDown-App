import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { compareSets, setWhen } from "../../../../lib/sets/when";
import { createClient } from "../../../../lib/supabase/server";
import { UUID } from "../../../versions/[id]/load";
import { createSet } from "../../../sets/actions";
import styles from "../../../sets/sets.module.css";

type Search = Promise<{ error?: string; deleted?: string }>;
export interface SetRow {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  type: "rehearsal" | "service" | "concert";
}
const ERRORS = new Set(["name", "date", "time", "time_needs_date", "type", "name_taken"]);

/** Upcoming and past sets of a band, or of the personal space (R-05.6, R-04.7). */
export default async function BandSetsPage({
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
  const [{ data: band }, { data: me }, { data: rows }] = await Promise.all([
    supabase.from("bands").select("id, name, is_personal").eq("id", id).maybeSingle(),
    supabase
      .from("band_members")
      .select("role")
      .eq("band_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.from("sets").select("id, name, date, time, type").eq("band_id", id),
  ]);
  if (!band || !me) notFound();
  const isMd = me.role === "md";
  const sets = (rows ?? []) as SetRow[];
  // Past: dated before today (UTC). Undated sets are upcoming, after the dated ones.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sets.filter((set) => !set.date || set.date >= today).sort(compareSets);
  const past = sets.filter((set) => set.date && set.date < today).sort((a, b) => compareSets(b, a));
  const { error, deleted } = await searchParams;
  const t = await getTranslations("sets");
  const format = await getFormatter();
  const title = band.is_personal ? t("mySets") : t("bandSets", { band: band.name });
  const when = (set: SetRow) => setWhen(format, set.date, set.time) ?? t("noDate");
  const list = (items: SetRow[], label: string, empty: string, key: string) => (
    <section aria-labelledby={key} className={styles.list}>
      <h2 id={key} className={styles.label}>
        {label}
      </h2>
      {items.length === 0 ? (
        <p className={styles.hint}>{empty}</p>
      ) : (
        <ul className={styles.items}>
          {items.map((set) => (
            <li key={set.id} className={styles.row}>
              <Link href={`/sets/${set.id}`} className={styles.link}>
                {set.name}
              </Link>
              <span className={styles.hint}>
                {when(set)} · {t(`types.${set.type}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      {deleted && (
        <p role="status" className={styles.message}>
          {t("deleted")}
        </p>
      )}
      {error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t(`errors.${ERRORS.has(error) ? error : "unknown"}`)}
        </p>
      )}
      {list(upcoming, t("upcoming"), t("noUpcoming"), "upcoming")}
      {list(past, t("past"), t("noPast"), "past")}
      {isMd && (
        <form action={createSet} className={styles.form}>
          <h2 className={styles.label}>{t("create")}</h2>
          <input type="hidden" name="bandId" value={band.id} />
          <label className={styles.field}>
            {t("name")}
            <input
              name="name"
              required
              maxLength={80}
              className={styles.input}
              autoComplete="off"
            />
          </label>
          <label className={styles.field}>
            {t("date")}
            <input name="date" type="date" className={styles.input} />
          </label>
          <label className={styles.field}>
            {t("time")}
            <input name="time" type="time" className={styles.input} />
          </label>
          <label className={styles.field}>
            {t("type")}
            <select name="type" required defaultValue="" className={styles.input}>
              <option value="" disabled>
                {t("chooseType")}
              </option>
              {(["rehearsal", "service", "concert"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary">
            {t("createButton")}
          </Button>
        </form>
      )}
      <Link href={band.is_personal ? "/bands" : `/bands/${band.id}`} className={styles.back}>
        {band.is_personal ? t("backToBands") : t("backToBand", { band: band.name })}
      </Link>
    </main>
  );
}
