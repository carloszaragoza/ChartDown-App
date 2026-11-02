import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient, readUser } from "../../../lib/supabase/server";
import { AddIcon } from "../../_components/ActionIcons";
import { LinkRow } from "../../_components/LinkRow";
import { LiveSearch } from "../../_components/LiveSearch";
import { VersionForm } from "./VersionForm";
import { guessPhone } from "../../../lib/shell/guessPhone";

type Search = Promise<{ q?: string; song?: string; from?: string }>;
interface Song {
  id: string;
  title: string;
  artists: string[];
  album: string | null;
  year: number | null;
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
  const { q = "", song: chosen, from } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await readUser(supabase);
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
    const start = song ? await startingChart(supabase, song.id as string, from) : null;
    return (
      <VersionForm
        phone={await guessPhone()}
        song={(song as Song | null) ?? null}
        defaultTitle={q.trim()}
        defaultAuthor={profile?.name ?? ""}
        {...(start ? { defaultContent: start.content } : {})}
        cancelHref={start?.from ? `/versions/${start.from}` : "/versions/new"}
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
  const results = ((found ?? []) as Omit<Song, "album" | "year">[]).map((song) => ({
    ...song,
    album: null as string | null,
    year: null as number | null,
  }));
  if (results.length > 0) {
    const { data: sources } = await supabase
      .from("versions")
      .select("song_id, source_album, source_year, updated_at")
      .in(
        "song_id",
        results.map((song) => song.id),
      )
      .eq("visibility", "public")
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    const seen = new Set<string>();
    for (const row of sources ?? []) {
      const songId = row.song_id as string;
      if (seen.has(songId)) continue;
      seen.add(songId);
      const song = results.find((item) => item.id === songId);
      if (!song) continue;
      song.album = (row.source_album as string | null) ?? null;
      song.year = (row.source_year as number | null) ?? null;
    }
  }

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
            <HStack gap={2} vAlign="center" wrap="wrap">
              <LiveSearch path="/versions/new" query={query} label={t("search.label")} />
              <Button label={t("import.open")} href="/versions/new/import" />
              <Button
                label={t("search.newSong")}
                variant="primary"
                href={newSong}
                icon={<AddIcon />}
              />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {query &&
              (results.length === 0 ? (
                <EmptyState title={t("search.none")} />
              ) : (
                <List density="spacious" edge="flush">
                  {results.map((result) => {
                    const line = [
                      result.artists.join(", "),
                      result.album,
                      result.year && String(result.year),
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <LinkRow
                        key={result.id}
                        href={`/versions/new?song=${result.id}`}
                        title={result.title}
                        {...(line ? { description: line } : {})}
                      />
                    );
                  })}
                </List>
              ))}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

/**
 * The chart a new version of an existing song starts from (R-02.1, T-2405): the version the
 * person came from, when it is of this song and they may read it, or else the song's most
 * recently updated public version; never a blank example.
 */
async function startingChart(
  supabase: Awaited<ReturnType<typeof createClient>>,
  songId: string,
  from: string | undefined,
): Promise<{ content: string; from: string | null } | null> {
  const chosen =
    from && UUID.test(from)
      ? (
          await supabase
            .from("versions")
            .select("id, current_revision_id")
            .eq("id", from)
            .eq("song_id", songId)
            .maybeSingle()
        ).data
      : null;
  const version =
    chosen ??
    (
      await supabase
        .from("versions")
        .select("id, current_revision_id")
        .eq("song_id", songId)
        .eq("visibility", "public")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data;
  if (!version?.current_revision_id) return null;
  const { data: revision } = await supabase
    .from("revisions")
    .select("content")
    .eq("id", version.current_revision_id)
    .maybeSingle();
  if (!revision) return null;
  return { content: revision.content as string, from: chosen ? (chosen.id as string) : null };
}
