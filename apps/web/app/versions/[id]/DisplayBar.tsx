import { keyName, type Chart } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { displayHref, keysInMode, type Display } from "./display";
import styles from "./version.module.css";

/**
 * Numbers or letters, and the key (R-03.2). Plain links and a form, so it works without
 * JavaScript; the choice lives in the address and nothing is saved.
 */
export function DisplayBar({
  path,
  chart,
  display,
}: {
  path: string;
  chart: Chart;
  display: Display;
}) {
  const t = useTranslations("viewer");
  const written = keyName(chart.key);
  const shown = keyName(display.key);
  return (
    <div className={styles.display} role="group" aria-label={t("label")}>
      <nav aria-label={t("style")} className={styles.styles}>
        {(["numbers", "letters"] as const).map((style) => (
          <Link
            key={style}
            href={displayHref(path, { ...display, style }, chart)}
            className={styles.choice}
            aria-current={display.style === style ? "true" : undefined}
          >
            {t(style)}
          </Link>
        ))}
      </nav>
      <form method="get" action={path} className={styles.keyForm}>
        {display.style === "letters" && <input type="hidden" name="view" value="letters" />}
        <label className={styles.keyLabel}>
          {t("key")}
          <select name="key" defaultValue={shown} className={styles.select}>
            {keysInMode(chart.key.minor).map((key) => {
              const name = keyName(key);
              return (
                <option key={name} value={name}>
                  {name === written ? t("writtenOption", { key: name }) : name}
                </option>
              );
            })}
          </select>
        </label>
        <Button type="submit">{t("apply")}</Button>
      </form>
      {shown !== written && (
        <Link
          href={displayHref(path, { ...display, key: chart.key }, chart)}
          className={styles.link}
        >
          {t("written", { key: written })}
        </Link>
      )}
    </div>
  );
}
