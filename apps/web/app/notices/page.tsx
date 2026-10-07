import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { noticeMessage, type Notice, type NoticeWords } from "../../lib/notices/notice";
import { setWhen } from "../../lib/sets/when";
import { createClient } from "../../lib/supabase/server";
import { markAllRead } from "./actions";

const LIMIT = 100;

/**
 * The person's notices (T-1002, R-09.3; Design Handoff 2.0 screen 01), newest first: each says
 * what changed. Opening one marks it read; new ones arrive without reloading (NoticesLive).
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
    reason: (reason) => t(reason === "lyrics" ? "reasons.lyrics" : "reasons.other"),
  };
  const notices = ((data ?? []) as Notice[]).flatMap((notice) => {
    const message = noticeMessage(notice, words);
    return message ? [{ ...notice, text: t(`types.${message.key}`, message.values) }] : [];
  });
  const unread = notices.some((notice) => !notice.read_at);
  const now = new Date();

  return (
    <Layout
      height="auto"
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between">
            <VStack gap={1}>
              <Heading level={1}>{t("title")}</Heading>
              <Text color="secondary">{t("description")}</Text>
            </VStack>
            <form action={markAllRead}>
              <Button
                type="submit"
                label={t("markAll")}
                isDisabled={!unread}
                {...(!unread ? { tooltip: t("nothingUnread") } : {})}
              />
            </form>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {notices.length === 0 ? (
            <EmptyState title={t("caughtUp")} description={t("none")} />
          ) : (
            <List header={<Text className="cd-visually-hidden">{t("list")}</Text>}>
              {notices.map((notice) => (
                <Item
                  key={notice.id}
                  as="li"
                  href={`/notices/${notice.id}`}
                  align="start"
                  startContent={
                    <StatusDot
                      variant={notice.read_at ? "neutral" : "accent"}
                      label={notice.read_at ? t("read") : t("new")}
                    />
                  }
                  label={<Text weight={notice.read_at ? "normal" : "semibold"}>{notice.text}</Text>}
                  endContent={
                    <Text type="supporting">
                      {format.relativeTime(new Date(notice.created_at), now)}
                    </Text>
                  }
                />
              ))}
            </List>
          )}
        </LayoutContent>
      }
    />
  );
}
