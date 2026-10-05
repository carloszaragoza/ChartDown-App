import { parse } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { createClient } from "../../../../../lib/supabase/server";
import styles from "../../history.module.css";
import { readDisplay } from "../../display";
import { loadVersion } from "../../load";
import { VersionView } from "../../VersionView";
import { restoreRevision } from "./actions";

/** One revision of a version, read-only, for its owner, who may restore it (R-02.8). */
export default async function RevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Promise<{ error?: string; view?: string; key?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id, n } = await params;
  const number = Number(n);
  if (!Number.isInteger(number) || number < 1) notFound();
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!version || !auth.user || auth.user.id !== version.ownerId) notFound();

  const { data: revision } = await supabase
    .from("revisions")
    .select("id, content")
    .eq("version_id", version.id)
    .eq("number", number)
    .maybeSingle();
  if (!revision) notFound();
  const search = await searchParams;
  const { error } = search;
  const chart = parse(revision.content);
  const t = await getTranslations("history");
  const isCurrent = revision.id === version.currentRevisionId;

  const notice = (
    <section className={styles.notice} aria-label={t("revision", { number })}>
      <div>
        <p>
          <b>{t("revision", { number })}</b> · {isCurrent ? t("isCurrent") : t("readOnly")}
        </p>
        {error && (
          <p role="alert" className={styles.alert}>
            {t("restoreError")}
          </p>
        )}
        <Link href={`/versions/${version.id}/history`} className={styles.back}>
          {t("backToHistory")}
        </Link>
      </div>
      {!isCurrent && version.status === "active" && (
        <form action={restoreRevision}>
          <input type="hidden" name="versionId" value={version.id} />
          <input type="hidden" name="revisionId" value={revision.id} />
          <input type="hidden" name="number" value={number} />
          <Button type="submit" variant="primary">
            {t("restore")}
          </Button>
        </form>
      )}
    </section>
  );

  return (
    <VersionView
      id={version.id}
      title={version.title}
      artists={version.artists}
      author={version.author}
      source={version.source}
      chart={chart}
      display={readDisplay(chart, search)}
      path={`/versions/${version.id}/revisions/${number}`}
      signedIn
      notice={notice}
    />
  );
}
