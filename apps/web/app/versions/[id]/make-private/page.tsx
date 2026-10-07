import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { makePrivate } from "../actions";
import styles from "../history.module.css";
import { loadVersion } from "../load";

/** The owner confirms making a public version private, knowing what happens (R-02.4). */
export default async function MakePrivatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (
    !version ||
    !auth.user ||
    auth.user.id !== version.ownerId ||
    version.visibility !== "public" ||
    version.status !== "active"
  )
    notFound();
  const { error } = await searchParams;
  const t = await getTranslations("makePrivate");

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.meta}>{version.title}</p>
      </div>
      {error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t("error")}
        </p>
      )}
      <ul className={styles.explain}>
        <li>{t("copy")}</li>
        <li>{t("frozen", { author: version.author })}</li>
        <li>{t("others")}</li>
        <li>{t("final")}</li>
      </ul>
      <form action={makePrivate}>
        <input type="hidden" name="versionId" value={version.id} />
        <Button type="submit" variant="primary">
          {t("confirm")}
        </Button>
      </form>
      <Link href={`/versions/${version.id}`} className={styles.back}>
        {t("cancel")}
      </Link>
    </div>
  );
}
