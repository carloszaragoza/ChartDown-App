import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { compareSets, setWhen } from "../../lib/sets/when";
import { createClient } from "../../lib/supabase/server";
import styles from "./sets.module.css";

type One<T> = T | T[] | null;
interface Row {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  type: "rehearsal" | "service" | "concert";
  band: One<{ name: string; is_personal: boolean }>;
}

/**
 * Sets in the top bar (T-706): the upcoming and past sets of every band the person is in,
 * their personal space included. Which sets they see is decided by row-level security.
 */
export default async function AllSetsPage() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/sets");
  const { data } = await supabase
    .from("sets")
    .select("id, name, date, time, type, band:bands(name, is_personal)");
  const sets = (data ?? []) as Row[];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sets.filter((set) => !set.date || set.date >= today).sort(compareSets);
  const past = sets.filter((set) => set.date && set.date < today).sort((a, b) => compareSets(b, a));
  const t = await getTranslations("sets");
  const format = await getFormatter();
  const bandOf = (set: Row) => {
    const band = Array.isArray(set.band) ? set.band[0] : set.band;
    return band?.is_personal ? t("mySets") : (band?.name ?? "");
  };
  const list = (items: Row[], label: string, empty: string, key: string) => (
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
                {[
                  bandOf(set),
                  setWhen(format, set.date, set.time) ?? t("noDate"),
                  t(`types.${set.type}`),
                ].join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("allSets")}</h1>
      {list(upcoming, t("upcoming"), t("noUpcoming"), "upcoming")}
      {list(past, t("past"), t("noPast"), "past")}
      <p className={styles.hint}>{t("allSetsHint")}</p>
    </div>
  );
}
