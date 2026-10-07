import { Button } from "@chartdown/ui";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import styles from "../admin.module.css";
import { createInvite, revokeInvite } from "./actions";

type Search = Promise<{ created?: string; revoked?: string; error?: string }>;
interface Code {
  id: string;
  code: string;
  kind: "single_use" | "band";
  max_uses: number | null;
  uses: number;
  note: string | null;
  created_at: string;
  revoked_at: string | null;
}
const PROBLEMS = ["uses", "note"] as const;

/** Invite codes (T-1102, R-01.7): create single-use or band codes, see their uses, revoke. */
export default async function AdminInvitesPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("invite_codes")
    .select("id, code, kind, max_uses, uses, note, created_at, revoked_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const codes = (data ?? []) as Code[];
  const t = await getTranslations("admin.invites");
  const admin = await getTranslations("admin");
  const format = await getFormatter();
  const { created, revoked, error } = await searchParams;

  return (
    <div className={styles.page}>
      <Link href="/admin" className={styles.link}>
        {admin("title")}
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      {(created || revoked) && (
        <p role="status" className={styles.message}>
          {created ? t("created", { code: created }) : t("revokedDone", { code: revoked ?? "" })}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.alert}>
          {(PROBLEMS as readonly string[]).includes(error)
            ? t(`problems.${error as (typeof PROBLEMS)[number]}`)
            : t("problems.unknown")}
        </p>
      )}

      <form action={createInvite} className={styles.form} aria-labelledby="create-title">
        <h2 id="create-title" className={styles.label}>
          {t("create")}
        </h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            {t("kind")}
            <select name="kind" className={styles.select} defaultValue="single_use">
              <option value="single_use">{t("kinds.single_use")}</option>
              <option value="band">{t("kinds.band")}</option>
            </select>
          </label>
          <label className={styles.field}>
            {t("maxUses")}
            <input className={styles.input} name="max_uses" type="number" min={1} max={10000} />
          </label>
          <label className={styles.field}>
            {t("note")}
            <input className={styles.input} name="note" maxLength={200} />
          </label>
        </div>
        <p className={styles.hint}>{t("maxUsesHint")}</p>
        <Button type="submit" variant="primary">
          {t("createSubmit")}
        </Button>
      </form>

      {codes.length === 0 ? (
        <p className={styles.hint}>{t("none")}</p>
      ) : (
        <ul className={styles.items} aria-label={t("list")}>
          {codes.map((code) => (
            <li key={code.id} className={styles.item} aria-labelledby={`code-${code.id}`}>
              <div className={styles.head}>
                <code
                  id={`code-${code.id}`}
                  className={`${styles.name} ${code.revoked_at ? styles.inactive : ""}`}
                >
                  {code.code}
                </code>
                <span className={styles.hint}>
                  {[
                    t(`kinds.${code.kind}`),
                    code.max_uses === null
                      ? t("usesNoLimit", { uses: code.uses })
                      : t("uses", { uses: code.uses, max: code.max_uses }),
                    format.dateTime(new Date(code.created_at), { dateStyle: "medium" }),
                  ].join(" · ")}
                </span>
                {code.revoked_at && <span className={styles.hint}>{t("revoked")}</span>}
              </div>
              {code.note && <p className={styles.message}>{code.note}</p>}
              {!code.revoked_at && (
                <form action={revokeInvite} className={styles.actions}>
                  <input type="hidden" name="id" value={code.id} />
                  <Button type="submit">{t("revoke", { code: code.code })}</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
