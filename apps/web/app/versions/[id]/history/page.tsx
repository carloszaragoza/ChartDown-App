import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { loadVersion } from "../load";
import styles from "../history.module.css";

type Search = Promise<{ restored?: string; as?: string }>;
interface Revision {
  id: string;
  number: number;
  created_at: string;
  restored_from_id: string | null;
  author: { name: string } | { name: string }[] | null;
}

/** A version's revisions, newest first, for its owner only (R-02.8). */
export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!version || !auth.user || auth.user.id !== version.ownerId) notFound();

  const { data } = await supabase
    .from("revisions")
    .select("id, number, created_at, restored_from_id, author:profiles(name)")
    .eq("version_id", version.id)
    .order("number", { ascending: false });
  const revisions = (data ?? []) as Revision[];
  const numberOf = new Map(revisions.map((revision) => [revision.id, revision.number]));
  const { restored, as } = await searchParams;
  const t = await getTranslations("history");
  const format = await getFormatter();

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.meta}>{version.title}</p>
      </div>
      {restored && as && (
        <p role="status" className={styles.message}>
          {t("restored", { number: restored, as })}
        </p>
      )}
      <ol className={styles.list}>
        {revisions.map((revision) => {
          const author = Array.isArray(revision.author) ? revision.author[0] : revision.author;
          const from = revision.restored_from_id && numberOf.get(revision.restored_from_id);
          return (
            <li key={revision.id} className={styles.item}>
              <Link
                href={`/versions/${version.id}/revisions/${revision.number}`}
                className={styles.revision}
              >
                {t("revision", { number: revision.number })}
              </Link>
              {revision.id === version.currentRevisionId && (
                <span className={styles.current}>{t("current")}</span>
              )}
              <span className={styles.meta}>
                {format.dateTime(new Date(revision.created_at), {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}{" "}
                UTC · {author?.name ?? "ChartDown"}
                {from ? ` · ${t("restoredFrom", { number: from })}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <Link href={`/versions/${version.id}`} className={styles.back}>
        {t("back")}
      </Link>
    </div>
  );
}
