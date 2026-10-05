import { Button, hasInstrumentIcon, Icon } from "@chartdown/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LOCALES } from "../../i18n/locales";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import styles from "./profile.module.css";
import { deleteAccount, saveProfile } from "./actions";

type Search = Promise<{ saved?: string; error?: string }>;
interface CatalogInstrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  active: boolean;
}

/** A person's name, interface language and the instruments they play (R-01.2, R-01.5). */
export default async function ProfilePage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/profile");

  const [{ data: profile }, { data: catalog }, { data: mine }] = await Promise.all([
    supabase.from("profiles").select("name, language").eq("id", auth.user.id).single(),
    supabase.from("instruments").select("id, slug, name_en, name_es, active"),
    supabase.from("user_instruments").select("instrument_id").eq("user_id", auth.user.id),
  ]);
  const { saved, error } = await searchParams;
  const t = await getTranslations("profile");
  const languageNames = await getTranslations("language");
  const locale = await getLocale();

  const chosen = new Set((mine ?? []).map((row) => row.instrument_id as string));
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  // Deactivated instruments are not offered, but stay on a profile that has them (R-07.3).
  const offered = ((catalog ?? []) as CatalogInstrument[])
    .filter((instrument) => instrument.active || chosen.has(instrument.id))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale));

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      {saved && (
        <p role="status" className={styles.message}>
          {t("saved")}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.alert}>
          {error === "name"
            ? t("nameRequired")
            : error === "confirm"
              ? t("delete.mismatch")
              : t("error")}
        </p>
      )}
      <form action={saveProfile} className={styles.form}>
        <label className={styles.field}>
          {t("name")}
          <input
            className={styles.input}
            name="name"
            defaultValue={profile?.name ?? ""}
            required
            maxLength={80}
            autoComplete="name"
          />
        </label>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>{languageNames("label")}</legend>
          {LOCALES.map((option) => (
            <label key={option} className={styles.choice} lang={option}>
              <input
                type="radio"
                name="language"
                value={option}
                defaultChecked={(profile?.language ?? locale) === option}
              />
              {languageNames(option)}
            </label>
          ))}
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>{t("instruments")}</legend>
          <p className={styles.hint}>{t("instrumentsHint")}</p>
          <div className={styles.instruments}>
            {offered.map((instrument) => (
              <label key={instrument.id} className={styles.choice}>
                <input
                  type="checkbox"
                  name="instrument"
                  value={instrument.id}
                  defaultChecked={chosen.has(instrument.id)}
                />
                {hasInstrumentIcon(instrument.slug) && <Icon name={instrument.slug} size={20} />}
                {nameOf(instrument)}
                {!instrument.active && <span className={styles.hint}>{t("noLongerOffered")}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
      </form>
      <section id="delete" className={styles.form} aria-labelledby="delete-title">
        <h2 id="delete-title" className={styles.legend}>
          {t("delete.title")}
        </h2>
        <p className={styles.message}>{t("delete.explain")}</p>
        <form action={deleteAccount} className={styles.group}>
          <label className={styles.field}>
            {t("delete.confirm")}
            <input
              className={styles.input}
              name="confirm"
              type="email"
              autoComplete="off"
              required
            />
          </label>
          <Button type="submit">{t("delete.submit")}</Button>
        </form>
      </section>
      <Link href="/" className={styles.back}>
        {t("back")}
      </Link>
    </main>
  );
}
