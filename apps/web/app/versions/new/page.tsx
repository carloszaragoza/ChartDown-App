import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { AddIcon } from "../../_components/ActionIcons";
import { SearchField } from "../../_components/SearchField";
import { VersionForm } from "./VersionForm";

type Search = Promise<{ q?: string; song?: string }>;
interface Song {
  id: string;
  title: string;
  artists: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Typed text is matched literally, never as a pattern.
const literal = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

/**
 * A new version in two steps (R-02.1): find the song, or start a new one; then the chart and its
 * source (Design Handoff 2.0 screen 05). Creating asks a visitor to sign in first (R-01.4).
 */
export default async function NewVersionPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { q = "", song: chosen } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/versions/new");
  const t = await getTranslations("newVersion");
  const c = await getTranslations("catalog");

  if (chosen === "new" || (chosen && UUID.test(chosen))) {
    const [{ data: profile }, { data: song }] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", auth.user.id).maybeSingle(),
      chosen === "new"
        ? Promise.resolve({ data: null })
        : supabase.from("songs").select("id, title, artists").eq("id", chosen).maybeSingle(),
    ]);
    if (chosen !== "new" && !song) notFound();
    return (
      <VersionForm
        song={(song as Song | null) ?? null}
        defaultTitle={q.trim()}
        defaultAuthor={profile?.name ?? ""}
      />
    );
  }

  const query = q.trim().slice(0, 200);
  const { data: found } = query
    ? await supabase
        .from("songs")
        .select("id, title, artists")
        .ilike("title", `%${literal(query)}%`)
        .order("title")
        .limit(20)
    : { data: null };
  const results = (found ?? []) as Song[];

  const newSong = query
    ? `/versions/new?song=new&q=${encodeURIComponent(query)}`
    : "/versions/new?song=new";
  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Breadcrumbs variant="supporting">
                <BreadcrumbItem href="/catalog">{c("title")}</BreadcrumbItem>
                <BreadcrumbItem>{t("title")}</BreadcrumbItem>
              </Breadcrumbs>
              <Heading level={1}>{t("title")}</Heading>
              <Text color="secondary">{t("intro")}</Text>
            </VStack>
            <Button
              label={t("search.newSong")}
              variant="primary"
              href={newSong}
              icon={<AddIcon />}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            <SearchField
              path="/versions/new"
              query={query}
              label={t("search.label")}
              submit={t("search.submit")}
            />
            {query &&
              (results.length === 0 ? (
                <EmptyState title={t("search.none")} />
              ) : (
                <List
                  hasDividers
                  edgeCompensation="inline"
                  header={<Heading level={2}>{t("search.results")}</Heading>}
                >
                  {results.map((result) => (
                    <Item
                      key={result.id}
                      as="li"
                      label={result.title}
                      {...(result.artists.length > 0
                        ? { description: result.artists.join(", ") }
                        : {})}
                      endContent={
                        <Button
                          label={t("search.use", { title: result.title })}
                          href={`/versions/new?song=${result.id}`}
                        >
                          {t("search.useShort")}
                        </Button>
                      }
                    />
                  ))}
                </List>
              ))}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
