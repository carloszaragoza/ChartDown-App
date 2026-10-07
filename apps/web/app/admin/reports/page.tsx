import { Button } from "@chartdown/ui";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import styles from "../admin.module.css";
import { dismissReport, hideVersion, showVersion } from "./actions";

type Search = Promise<{ hidden?: string; shown?: string; dismissed?: string; error?: string }>;
type One<T> = T | T[] | null;
interface VersionRow {
  id: string;
  author_name: string;
  song: One<{ title: string }>;
}
interface ReportRow {
  id: string;
  reason: "lyrics" | "other";
  note: string | null;
  created_at: string;
  version: One<VersionRow>;
}
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/**
 * Reports (T-1103, R-07.2): open reports grouped by version, oldest first, to hide the version or
 * dismiss each report; hidden versions, to show again.
 */
export default async function AdminReportsPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const [{ data: reports }, { data: hidden }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, reason, note, created_at, version:versions(id, author_name, song:songs(title))")
      .eq("status", "open")
      .order("created_at"),
    supabase
      .from("versions")
      .select("id, author_name, song:songs(title)")
      .eq("status", "hidden")
      .order("updated_at", { ascending: false }),
  ]);
  const t = await getTranslations("admin.reports");
  const admin = await getTranslations("admin");
  const format = await getFormatter();
  const { hidden: hiddenDone, shown, dismissed, error } = await searchParams;

  const byVersion = new Map<string, { version: VersionRow; reports: ReportRow[] }>();
  for (const report of (reports ?? []) as ReportRow[]) {
    const version = one(report.version);
    if (!version) continue;
    const group = byVersion.get(version.id) ?? { version, reports: [] };
    group.reports.push(report);
    byVersion.set(version.id, group);
  }
  const titleOf = (version: VersionRow) => one(version.song)?.title ?? "";
  const status = hiddenDone
    ? t("hiddenDone", { title: hiddenDone })
    : shown
      ? t("shownDone", { title: shown })
      : dismissed
        ? t("dismissedDone")
        : null;

  return (
    <div className={styles.page}>
      <Link href="/admin" className={styles.link}>
        {admin("title")}
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      {status && (
        <p role="status" className={styles.message}>
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.alert}>
          {t("failed")}
        </p>
      )}

      <section aria-labelledby="open-title" className={styles.section}>
        <h2 id="open-title" className={styles.label}>
          {t("open")}
        </h2>
        {byVersion.size === 0 ? (
          <p className={styles.hint}>{t("none")}</p>
        ) : (
          <ul className={styles.items}>
            {[...byVersion.values()].map(({ version, reports: list }) => (
              <li key={version.id} className={styles.item} aria-label={titleOf(version)}>
                <div className={styles.head}>
                  <Link href={`/versions/${version.id}`} className={styles.link}>
                    {t("openVersion", { title: titleOf(version) })}
                  </Link>
                  <span className={styles.hint}>
                    {version.author_name} · {t("reportedBy", { count: list.length })}
                  </span>
                </div>
                {list.map((report) => (
                  <div key={report.id} className={styles.head}>
                    <span className={styles.message}>
                      {t(`reasons.${report.reason}`)}
                      {report.note ? `: ${report.note}` : ""}
                    </span>
                    <span className={styles.hint}>
                      {format.dateTime(new Date(report.created_at), { dateStyle: "medium" })}
                    </span>
                    <form action={dismissReport}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <Button type="submit">{t("dismiss")}</Button>
                    </form>
                  </div>
                ))}
                <form action={hideVersion} className={styles.fields}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="title" value={titleOf(version)} />
                  <label className={styles.field}>
                    {t("hideReason")}
                    <select
                      name="reason"
                      className={styles.select}
                      defaultValue={list.some((r) => r.reason === "lyrics") ? "lyrics" : "other"}
                    >
                      <option value="lyrics">{t("reasons.lyrics")}</option>
                      <option value="other">{t("reasons.other")}</option>
                    </select>
                  </label>
                  <Button type="submit" variant="primary">
                    {t("hide", { title: titleOf(version) })}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="hidden-title" className={styles.section}>
        <h2 id="hidden-title" className={styles.label}>
          {t("hidden")}
        </h2>
        {(hidden ?? []).length === 0 ? (
          <p className={styles.hint}>{t("noneHidden")}</p>
        ) : (
          <ul className={styles.items}>
            {((hidden ?? []) as VersionRow[]).map((version) => (
              <li key={version.id} className={styles.item}>
                <div className={styles.head}>
                  <Link href={`/versions/${version.id}`} className={styles.link}>
                    {titleOf(version)}
                  </Link>
                  <span className={styles.hint}>{version.author_name}</span>
                </div>
                <form action={showVersion} className={styles.actions}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="title" value={titleOf(version)} />
                  <Button type="submit">{t("show", { title: titleOf(version) })}</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
