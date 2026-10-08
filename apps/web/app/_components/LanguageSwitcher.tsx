import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "../../i18n/locales";
import { setLocale } from "../actions";
import styles from "./LanguageSwitcher.module.css";

/**
 * English / Español as one sliding toggle (R-01.5). A plain form, so it also works before
 * JavaScript loads: the chosen language is the pressed button, and a thumb slides under it.
 */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const current = useLocale();
  const index = Math.max(0, LOCALES.indexOf(current as (typeof LOCALES)[number]));
  return (
    <form
      action={setLocale}
      className={styles.switcher}
      aria-label={t("label")}
      style={{ "--index": index, "--count": LOCALES.length } as CSSProperties}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          lang={locale}
          aria-pressed={locale === current}
          className={styles.button}
        >
          {t(locale)}
        </button>
      ))}
    </form>
  );
}
