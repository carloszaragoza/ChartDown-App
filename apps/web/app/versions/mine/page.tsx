import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";

type One<T> = T | T[] | null;
interface Row {
  id: string;
  visibility: "public" | "private";
  status: "active" | "frozen" | "hidden";
  updated_at: string;
  song: One<{ title: string }>;
}

/**
 * Your versions (Design Handoff 2.0, section 4): the person's own versions, where the side
 * navigation's Chart editor and Director's notes lead when no version is open.
 */
export default async function YourVersionsPage() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/versions/mine");
  const { data } = await supabase
    .from("versions")
    .select("id, visibility, status, updated_at, song:songs(title)")
    .eq("owner_id", auth.user.id)
    .order("updated_at", { ascending: false });
  const versions = (data ?? []) as Row[];
  const t = await getTranslations("mine");
  const format = await getFormatter();
  const title = (row: Row) =>
    (Array.isArray(row.song) ? row.song[0]?.title : row.song?.title) ?? "";
  const state = (row: Row) =>
    row.status === "hidden"
      ? t("hidden")
      : row.status === "frozen"
        ? t("frozen")
        : row.visibility === "private"
          ? t("private")
          : t("public");

  return (
    <Layout
      height="auto"
      contentWidth={960}
      header={
        <LayoutHeader>
          <HStack gap={4} vAlign="center" hAlign="between">
            <VStack gap={1}>
              <Heading level={1}>{t("title")}</Heading>
              <Text color="secondary">{t("description")}</Text>
            </VStack>
            <Button label={t("newVersion")} variant="primary" href="/versions/new" />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          {versions.length === 0 ? (
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              actions={<Button label={t("newVersion")} variant="primary" href="/versions/new" />}
            />
          ) : (
            <List hasDividers>
              {versions.map((row) => (
                <Item
                  key={row.id}
                  as="li"
                  label={title(row)}
                  description={t("updated", {
                    when: format.dateTime(new Date(row.updated_at), { dateStyle: "medium" }),
                  })}
                  endContent={
                    <HStack gap={2} vAlign="center">
                      <Token label={state(row)} size="sm" />
                      <Button
                        label={t("open", { title: title(row) })}
                        variant="ghost"
                        size="sm"
                        href={`/versions/${row.id}`}
                      >
                        {t("openShort")}
                      </Button>
                      {row.status === "active" && (
                        <Button
                          label={t("edit", { title: title(row) })}
                          size="sm"
                          href={`/versions/${row.id}/edit`}
                        >
                          {t("editShort")}
                        </Button>
                      )}
                      <Button
                        label={t("notes", { title: title(row) })}
                        size="sm"
                        href={`/versions/${row.id}/notes`}
                      >
                        {t("notesShort")}
                      </Button>
                    </HStack>
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
