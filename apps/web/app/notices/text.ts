import { getFormatter, getTranslations } from "next-intl/server";
import { noticeMessage, type Notice, type NoticeWords } from "../../lib/notices/notice";
import { setWhen } from "../../lib/sets/when";

/**
 * Each notice with the sentence that says what changed (T-1002), in the reader's language. Notices
 * of a kind this version doesn't know are left out.
 */
export async function noticeTexts<T extends Notice>(
  notices: T[],
): Promise<(T & { text: string })[]> {
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
    reason: (reason) => t(reason === "lyrics" ? "reasons.lyrics" : "reasons.other"),
  };
  return notices.flatMap((notice) => {
    const message = noticeMessage(notice, words);
    return message ? [{ ...notice, text: t(`types.${message.key}`, message.values) }] : [];
  });
}
