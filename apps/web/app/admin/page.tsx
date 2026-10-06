import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "../../lib/admin/guard";
import styles from "./admin.module.css";

/** The Admin's area (E11): what they can manage. */
export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const parts = [
    { href: "/admin/instruments", label: t("instruments.title"), hint: t("instruments.hint") },
    { href: "/admin/invites", label: t("invites.title"), hint: t("invites.hint") },
  ];
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <ul className={styles.items}>
        {parts.map((part) => (
          <li key={part.href} className={styles.item}>
            <Link href={part.href} className={styles.link}>
              {part.label}
            </Link>
            <span className={styles.hint}>{part.hint}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
