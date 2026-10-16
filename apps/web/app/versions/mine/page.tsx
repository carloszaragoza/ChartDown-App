import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient, readUser } from "../../../lib/supabase/server";
import { ActionRow } from "../../_components/ActionRow";
import { EditIcon, GoIcon, NoteIcon } from "../../_components/ActionIcons";
import { SearchField } from "../../_components/SearchField";
import { guessPhone } from "../../../lib/shell/guessPhone";

type One<T> = T | T[] | null;
interface Row {
  id: string;
  visibility: "public" | "private";
  status: "active" | "frozen" | "hidden";
  updated_at: string;
  song: One<{ title: string }>;
}

const PAGE_SIZE = 50;
// Typed text is matched literally, never as a pattern.
const literal = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

/**
 * Your versions (Design Handoff 2.0, section 4): the person's own versions, where the side
 * navigation's Chart editor and Director's notes lead when no version is open. Searched by title
 * and shown 50 at a time, for someone with hundreds; a row opens its version, and its actions are
 * icons (design handoff 1.8; T-2406).
 */
export default async function YourVersionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await readUser(supabase);
  if (!auth.user) redirect("/auth/sign-in?next=/versions/mine");
  const { q = "", page: pageText } = await searchParams;
  const query = q.trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(pageText ?? "1", 10) || 1);
  let request = supabase
    .from("versions")
    .select(`id, visibility, status, updated_at, song:songs${query ? "!inner" : ""}(title)`)
    .eq("owner_id", auth.user.id);
  if (query) request = request.ilike("songs.title", `%${literal(query)}%`);
  // One more than a page, to know whether there is a next one.
  const { data } = await request
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const found = (data ?? []) as Row[];
  const hasNext = found.length > PAGE_SIZE;
  const versions = found.slice(0, PAGE_SIZE);
  const href = (to: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (to > 1) params.set("page", String(to));
    const text = params.toString();
    return text ? `/versions/mine?${text}` : "/versions/mine";
  };
  const t = await getTranslations("mine");
  const c = await getTranslations("catalog");
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

  const phone = await guessPhone();
  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={960}
      header={
        <LayoutHeader>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
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
          <VStack gap={4}>
            {(query || page > 1 || versions.length > 0) && (
              <SearchField
                path="/versions/mine"
                query={query}
                label={t("search")}
                submit={c("submit")}
              />
            )}
            {versions.length === 0 && query ? (
              <EmptyState title={t("none")} />
            ) : versions.length === 0 ? (
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                actions={<Button label={t("newVersion")} variant="primary" href="/versions/new" />}
              />
            ) : (
              <List hasDividers>
                {versions.map((row) => (
                  <ActionRow
                    key={row.id}
                    phone={phone}
                    isLink
                    label={title(row)}
                    description={t("updated", {
                      when: format.dateTime(new Date(row.updated_at), { dateStyle: "medium" }),
                    })}
                    actions={
                      <>
                        <Token label={state(row)} size="sm" />
                        <Button
                          label={t("open", { title: title(row) })}
                          tooltip={t("openShort")}
                          variant="ghost"
                          href={`/versions/${row.id}`}
                          icon={<GoIcon />}
                          isIconOnly
                        />
                        {row.status === "active" && (
                          <Button
                            label={t("edit", { title: title(row) })}
                            tooltip={t("editShort")}
                            variant="ghost"
                            href={`/versions/${row.id}/edit`}
                            icon={<EditIcon />}
                            isIconOnly
                          />
                        )}
                        <Button
                          label={t("notes", { title: title(row) })}
                          tooltip={t("notesShort")}
                          variant="ghost"
                          href={`/versions/${row.id}/notes`}
                          icon={<NoteIcon />}
                          isIconOnly
                        />
                      </>
                    }
                  />
                ))}
              </List>
            )}
            {(page > 1 || hasNext) && (
              <nav aria-label={c("pages")}>
                <HStack gap={2}>
                  {page > 1 && <Button label={c("previous")} href={href(page - 1)} />}
                  {hasNext && <Button label={c("next")} href={href(page + 1)} />}
                </HStack>
              </nav>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
