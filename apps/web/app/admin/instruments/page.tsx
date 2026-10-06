import { Button, hasInstrumentIcon, Icon } from "@chartdown/ui";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import styles from "../admin.module.css";
import { addInstrument, setInstrumentActive, updateInstrument } from "./actions";

type Search = Promise<{
  saved?: string;
  deactivated?: string;
  reactivated?: string;
  error?: string;
}>;
interface Instrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  aliases: string[];
  active: boolean;
}
const PROBLEMS = ["slug", "name", "alias", "taken"] as const;

/**
 * The instrument catalog (T-1101, R-07.3): add, rename, deactivate and reactivate; never delete.
 * The slug is fixed once added, since charts use it.
 */
export default async function AdminInstrumentsPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("instruments")
    .select("id, slug, name_en, name_es, aliases, active");
  const locale = await getLocale();
  const nameOf = (instrument: Instrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const instruments = ((data ?? []) as Instrument[]).sort(
    (a, b) => Number(b.active) - Number(a.active) || nameOf(a).localeCompare(nameOf(b), locale),
  );
  const t = await getTranslations("admin.instruments");
  const admin = await getTranslations("admin");
  const { saved, deactivated, reactivated, error } = await searchParams;
  const status = saved
    ? t("saved", { slug: saved })
    : deactivated
      ? t("deactivatedDone", { slug: deactivated })
      : reactivated
        ? t("reactivatedDone", { slug: reactivated })
        : null;

  const fields = (instrument?: Instrument) => (
    <>
      <label className={styles.field}>
        {t("nameEn")}
        <input
          className={styles.input}
          name="name_en"
          required
          maxLength={40}
          defaultValue={instrument?.name_en}
        />
      </label>
      <label className={styles.field}>
        {t("nameEs")}
        <input
          className={styles.input}
          name="name_es"
          required
          maxLength={40}
          defaultValue={instrument?.name_es}
        />
      </label>
      <label className={styles.field}>
        {t("aliases")}
        <input
          className={styles.input}
          name="aliases"
          defaultValue={instrument?.aliases.join(", ")}
        />
      </label>
    </>
  );

  return (
    <main className={styles.page}>
      <Link href="/admin" className={styles.link}>
        {admin("title")}
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      {status && (
        <p role="status" className={styles.message}>
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.alert}>
          {(PROBLEMS as readonly string[]).includes(error)
            ? t(`problems.${error as (typeof PROBLEMS)[number]}`)
            : t("problems.unknown")}
        </p>
      )}

      <form action={addInstrument} className={styles.form} aria-labelledby="add-title">
        <h2 id="add-title" className={styles.label}>
          {t("add")}
        </h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            {t("slug")}
            <input className={styles.input} name="slug" required maxLength={30} />
          </label>
          {fields()}
        </div>
        <p className={styles.hint}>{t("slugHint")}</p>
        <Button type="submit" variant="primary">
          {t("addSubmit")}
        </Button>
      </form>

      <ul className={styles.items} aria-label={t("list")}>
        {instruments.map((instrument) => (
          <li
            key={instrument.id}
            className={styles.item}
            aria-labelledby={`instrument-${instrument.id}`}
          >
            <div className={styles.head}>
              {hasInstrumentIcon(instrument.slug) && <Icon name={instrument.slug} size={20} />}
              <span
                id={`instrument-${instrument.id}`}
                className={`${styles.name} ${instrument.active ? "" : styles.inactive}`}
              >
                {nameOf(instrument)}
              </span>
              <code className={styles.hint}>{instrument.slug}</code>
              {!instrument.active && <span className={styles.hint}>{t("inactive")}</span>}
            </div>
            <form
              action={updateInstrument}
              className={styles.fields}
              aria-label={t("editOf", { name: nameOf(instrument) })}
            >
              <input type="hidden" name="id" value={instrument.id} />
              {fields(instrument)}
              <Button type="submit">{t("save")}</Button>
            </form>
            <form action={setInstrumentActive} className={styles.actions}>
              <input type="hidden" name="id" value={instrument.id} />
              <input type="hidden" name="active" value={String(!instrument.active)} />
              <Button type="submit">
                {instrument.active
                  ? t("deactivate", { name: nameOf(instrument) })
                  : t("reactivate", { name: nameOf(instrument) })}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
