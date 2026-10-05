import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { Invitations, type Invitation } from "../_components/Invitations";
import { createBand } from "./actions";
import styles from "./bands.module.css";

type Search = Promise<{ error?: string; left?: string; declined?: string }>;
interface Membership {
  role: "md" | "musician";
  band:
    | { id: string; name: string; is_personal: boolean }
    | { id: string; name: string; is_personal: boolean }[]
    | null;
}

/** The person's bands with their role in each, their invitations, and a new band (R-04.1, R-04.5). */
export default async function BandsPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/bands");

  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    supabase
      .from("band_members")
      .select("role, band:bands(id, name, is_personal)")
      .eq("user_id", auth.user.id),
    supabase.rpc("my_invitations"),
  ]);
  // The personal space is not a band to list (R-04.7).
  const all = ((memberships ?? []) as Membership[]).map((row) => ({
    role: row.role,
    band: Array.isArray(row.band) ? row.band[0] : row.band,
  }));
  const personal = all.find((row) => row.band?.is_personal)?.band;
  const bands = all
    .filter((row) => row.band && !row.band.is_personal)
    .sort((a, b) => (a.band?.name ?? "").localeCompare(b.band?.name ?? ""));
  const search = await searchParams;
  const t = await getTranslations("bands");

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      {(search.left || search.declined) && (
        <p role="status" className={styles.message}>
          {search.left ? t("left") : t("declined")}
        </p>
      )}
      {search.error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {search.error === "name" ? t("errors.name") : t("errors.unknown")}
        </p>
      )}
      <Invitations invitations={(invitations ?? []) as Invitation[]} />
      {personal && (
        <Link href={`/bands/${personal.id}/sets`} className="cd-button cd-button--secondary">
          {t("mySets")}
        </Link>
      )}

      <section aria-labelledby="my-bands" className={styles.list}>
        <h2 id="my-bands" className={styles.label}>
          {t("mine")}
        </h2>
        {bands.length === 0 ? (
          <p className={styles.hint}>{t("none")}</p>
        ) : (
          <ul className={styles.items}>
            {bands.map(({ role, band }) =>
              band ? (
                <li key={band.id} className={styles.row}>
                  <Link href={`/bands/${band.id}`} className={styles.link}>
                    {band.name}
                  </Link>
                  <span className={styles.hint}>{role === "md" ? t("md") : t("musician")}</span>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>

      <form action={createBand} className={styles.form}>
        <h2 className={styles.label}>{t("create")}</h2>
        <label className={styles.field}>
          {t("name")}
          <input name="name" required maxLength={80} className={styles.input} autoComplete="off" />
        </label>
        <p className={styles.hint}>{t("createHint")}</p>
        <Button type="submit" variant="primary">
          {t("createButton")}
        </Button>
      </form>
      <Link href="/" className={styles.back}>
        {t("home")}
      </Link>
    </main>
  );
}
