import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "../../i18n/locales";
import { setLocale } from "../actions";
import styles from "./LanguageSwitcher.module.css";

/** English / Español buttons (R-01.5). A plain form, so it also works before JavaScript loads. */
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
          aria-pressed={locale === current}
          className={styles.button}
        >
          {t(locale)}
        </button>
      ))}
    </form>
  );
}
