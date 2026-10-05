import { Button } from "@chartdown/ui";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { noticeMessage, type Notice, type NoticeWords } from "../../lib/notices/notice";
import { setWhen } from "../../lib/sets/when";
import { createClient } from "../../lib/supabase/server";
import { markAllRead, openNotice } from "./actions";
import styles from "./notices.module.css";

const LIMIT = 100;

/**
 * The person's notices (T-1002, R-09.3), newest first: each says what changed. Opening one marks
 * it read; new ones arrive without reloading (NoticesLive in the layout).
 */
export default async function NoticesPage() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/notices");
  const { data } = await supabase
    .from("notifications")
    .select("id, type, detail, created_at, read_at")
    .order("created_at", { ascending: false })
    .order("id")
    .limit(LIMIT);
  const t = await getTranslations("notices");
  const instruments = await getTranslations("instruments");
  const format = await getFormatter();
  const words: NoticeWords = {
    instrument: (slug) => (instruments.has(slug) ? instruments(slug) : slug),
    when: (date, time) => setWhen(format, date, time) ?? t("noDate"),
    day: (date) => format.dateTime(new Date(`${date}T00:00:00`), { dateStyle: "medium" }),
    writtenKey: t("writtenKey"),
    everyone: t("everyone"),
    place: (section, bar) => (bar ? t("place", { section, bar }) : section),
  };
  const notices = ((data ?? []) as Notice[]).flatMap((notice) => {
    const message = noticeMessage(notice, words);
    return message ? [{ ...notice, text: t(`types.${message.key}`, message.values) }] : [];
  });
  const unread = notices.some((notice) => !notice.read_at);

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t("title")}</h1>
        {unread && (
          <form action={markAllRead}>
            <Button type="submit">{t("markAll")}</Button>
          </form>
        )}
      </div>
      {notices.length === 0 ? (
        <p className={styles.hint}>{t("none")}</p>
      ) : (
        <ul className={styles.items} aria-label={t("list")}>
          {notices.map((notice) => (
            <li key={notice.id} className={styles.item}>
              <form action={openNotice}>
                <input type="hidden" name="id" value={notice.id} />
                <button type="submit" className={styles.open}>
                  {!notice.read_at && (
                    <>
                      <span className={styles.new}>{t("new")}</span>{" "}
                    </>
                  )}
                  <span className={styles.text}>{notice.text}</span>
                </button>
              </form>
              <span className={styles.hint}>
                {format.dateTime(new Date(notice.created_at), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
