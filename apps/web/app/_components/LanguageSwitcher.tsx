import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "../../i18n/locales";
import { setLocale } from "../actions";
import styles from "./LanguageSwitcher.module.css";

/**
 * EN | ES, small and quiet, for the foot of the landing page (R-01.5). A plain form, so it also
 * works before JavaScript loads. Each code is named in its own language for assistive technology.
 */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const current = useLocale();
  return (
    <form action={setLocale} className={styles.switcher} aria-label={t("label")}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          lang={locale}
          aria-label={t(locale)}
          aria-pressed={locale === current}
          className={styles.button}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </form>
  );
}
