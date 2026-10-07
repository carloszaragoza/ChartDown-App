import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Markdown } from "../../lib/legal/Markdown";
import { LEGAL_TEXTS, type LegalDocument } from "../../lib/legal/texts";
import styles from "./legal.module.css";

/**
 * The Terms of Use or the Privacy Notice (T-1202), in the reader's language. Open to everyone,
 * in production too, so they can be read before creating an account.
 */
export async function LegalPage({ document }: { document: LegalDocument }) {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const other: LegalDocument = document === "terms" ? "privacy" : "terms";
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.link}>
        {t("home")}
      </Link>
      <Markdown
        text={LEGAL_TEXTS[document][locale === "es" ? "es" : "en"]}
        className={styles.text}
      />
      <Link href={`/${other}`} className={styles.link}>
        {t("other", { name: t(other) })}
      </Link>
    </div>
  );
}
