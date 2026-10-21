import { keyName, parse } from "chartdown";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient, readUser } from "../../lib/supabase/server";
import { SOURCE_TYPES, type SourceType } from "../../lib/versions/validate";
import { AddIcon, ForkIcon } from "../_components/ActionIcons";
import { forkVersion } from "../versions/[id]/actions";
import { CatalogSearch } from "./CatalogSearch";
import { ActionRow } from "../_components/ActionRow";
import { RememberCatalog } from "./RememberCatalog";
import { guessPhone } from "../../lib/shell/guessPhone";

type Search = Promise<{ q?: string; source?: string; page?: string; song?: string }>;
interface Row {
  song_id: string;
  title: string;
  artists: string[];
  versions: number;
}
interface Listed {
  id: string;
  song_id: string;
  owner_id: string | null;
  author_name: string;
  status: "active" | "frozen" | "hidden";
  source_type: SourceType;
  source_album: string | null;
  source_year: number | null;
  source_youtube_url: string | null;
  current_revision_id: string | null;
}

const PAGE_SIZE = 30;

/**
 * The public catalog (R-02.9, R-02.10; Design Handoff 2.0 screen 04): songs with how many public
 * versions each has, searched by title, artist or album and filtered by source. One song is open
 * in a card with its versions, to open or fork; the others are rows that open in its place. Anyone may browse
 * it (R-01.4). Which versions count is decided in the database, never here (R-02.5).
 */
export default async function CatalogPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { q = "", source: chosen, page: pageText, song: openSong } = await searchParams;
  const query = q.trim().slice(0, 200);
  const source = (SOURCE_TYPES as readonly string[]).includes(chosen ?? "")
    ? (chosen as SourceType)
    : null;
  const page = Math.max(1, Math.floor(Number(pageText)) || 1);

  const supabase = await createClient();
  const [{ data, error }, { data: auth }] = await Promise.all([
    supabase.rpc("catalog", { query, source, page }),
    readUser(supabase),
  ]);
  const rows = (data ?? []) as Row[];
  const songs = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  // The versions of the songs on this page, with the rule of the catalog: public, active or
  // frozen, and of the chosen source.
  let versionQuery = supabase
    .from("versions")
    .select(
      "id, song_id, owner_id, author_name, status, source_type, source_album, source_year, source_youtube_url, current_revision_id",
    )
    .in(
      "song_id",
      songs.map((song) => song.song_id),
    )
    .eq("visibility", "public")
    .in("status", ["active", "frozen"])
    .order("created_at");
  if (source) versionQuery = versionQuery.eq("source_type", source);
  const { data: versionRows } = songs.length ? await versionQuery : { data: [] };
  const versions = (versionRows ?? []) as Listed[];
  // Key and meter come from each version's current revision.
  const currentIds = versions
    .map((version) => version.current_revision_id)
    .filter((id): id is string => Boolean(id));
  const { data: revisions } = currentIds.length
    ? await supabase.from("revisions").select("id, content").in("id", currentIds)
    : { data: [] };
  const charts = new Map(
    (revisions ?? []).map((revision) => {
      const chart = parse(revision.content as string);
      return [
        revision.id as string,
        {
          key: keyName(chart.key),
          meter: chart.header.meter ?? "4/4",
          tempo: chart.header.tempo ?? null,
        },
      ];
    }),
  );

  const t = await getTranslations("catalog");
  const sources = await getTranslations("version.source");
  const v = await getTranslations("version");
  const c = await getTranslations("chart");
  const href = (changes: { page?: number; song?: string }) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (source) params.set("source", source);
    const nextPage = changes.page ?? page;
    if (nextPage > 1) params.set("page", String(nextPage));
    if (changes.song) params.set("song", changes.song);
    const text = params.toString();
    return text ? `/catalog?${text}` : "/catalog";
  };
  // The open song: the one chosen, or the first.
  const open = songs.find((song) => song.song_id === openSong) ?? songs[0];
  const others = songs.filter((song) => song !== open);
  const signedIn = Boolean(auth.user);

  const phone = await guessPhone();
  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={960}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">{t("overline")}</Text>
              <Heading level={1}>{t("title")}</Heading>
              <Text color="secondary">{t("intro")}</Text>
            </VStack>
            <Button
              label={t("newVersion")}
              variant="primary"
              href="/versions/new"
              icon={<AddIcon />}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            <CatalogSearch
              query={query}
              source={source}
              sources={[
                { value: "all", label: t("all") },
                ...SOURCE_TYPES.map((type) => ({ value: type, label: sources(type) })),
              ]}
              words={{
                search: t("search"),
                placeholder: t("placeholder"),
                submit: t("submit"),
                sources: t("sources"),
              }}
            />
            {error ? (
              <div role="alert">
                <EmptyState title={t("error")} />
              </div>
            ) : !open ? (
              <EmptyState title={t("none")} />
            ) : (
              <>
                <RememberCatalog
                  url={href({ song: open.song_id })}
                  song={open.song_id}
                  target="catalog-open-song"
                />
                <div id="catalog-open-song">
                  <Card>
                    <VStack gap={2}>
                      <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                        <VStack gap={0.5}>
                          <Heading level={2}>{open.title}</Heading>
                          {open.artists.length > 0 && (
                            <Text type="supporting">{open.artists.join(", ")}</Text>
                          )}
                        </VStack>
                        <Text type="supporting">{t("versions", { count: open.versions })}</Text>
                      </HStack>
                      <List
                        hasDividers
                        edgeCompensation="inline"
                        header={
                          <Text className="cd-visually-hidden">
                            {t("versionsOf", { title: open.title })}
                          </Text>
                        }
                      >
                        {versions
                          .filter((version) => version.song_id === open.song_id)
                          .map((version) => {
                            const chart = version.current_revision_id
                              ? charts.get(version.current_revision_id)
                              : undefined;
                            const mine = signedIn && auth.user?.id === version.owner_id;
                            const names = { title: open.title, author: version.author_name };
                            return (
                              <ActionRow
                                key={version.id}
                                phone={phone}
                                isLink
                                // What a musician plays first, then where it comes from and
                                // who arranged it (owner's review, October 21, 2026; T-2812).
                                label={
                                  chart
                                    ? [
                                        `${t("key")} ${chart.key}`,
                                        chart.meter,
                                        chart.tempo && `${c("tempo")} ${chart.tempo}`,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")
                                    : sources(version.source_type)
                                }
                                description={[
                                  chart && sources(version.source_type),
                                  version.source_album &&
                                    v("album", { album: version.source_album }),
                                  version.source_year && String(version.source_year),
                                  t("by", { author: version.author_name }),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                                actions={
                                  <>
                                    {/* The catalog is all public: only a frozen one says so. */}
                                    {version.status === "frozen" && (
                                      <Token label={v("frozen")} size="sm" />
                                    )}
                                    <Button
                                      label={t("openName", names)}
                                      href={`/versions/${version.id}`}
                                    >
                                      {t("open")}
                                    </Button>
                                    {!mine &&
                                      (signedIn ? (
                                        <form action={forkVersion}>
                                          <input
                                            type="hidden"
                                            name="versionId"
                                            value={version.id}
                                          />
                                          <Button
                                            type="submit"
                                            label={t("forkName", names)}
                                            icon={<ForkIcon />}
                                          >
                                            {t("fork")}
                                          </Button>
                                        </form>
                                      ) : (
                                        <Button
                                          label={t("forkName", names)}
                                          href={`/auth/sign-in?next=${encodeURIComponent(`/versions/${version.id}`)}`}
                                          icon={<ForkIcon />}
                                        >
                                          {t("fork")}
                                        </Button>
                                      ))}
                                  </>
                                }
                              />
                            );
                          })}
                      </List>
                      <HStack>
                        <Button
                          label={t("songPage", { title: open.title })}
                          variant="ghost"
                          href={`/songs/${open.song_id}`}
                        />
                      </HStack>
                    </VStack>
                  </Card>
                </div>
                {others.length > 0 && (
                  <List
                    hasDividers
                    edgeCompensation="inline"
                    header={<Text className="cd-visually-hidden">{t("otherSongs")}</Text>}
                  >
                    {others.map((song) => (
                      <Item
                        key={song.song_id}
                        as="li"
                        href={href({ song: song.song_id })}
                        label={song.title}
                        {...(song.artists.length > 0
                          ? { description: song.artists.join(", ") }
                          : {})}
                        endContent={
                          <Text type="supporting">{t("versions", { count: song.versions })}</Text>
                        }
                      />
                    ))}
                  </List>
                )}
              </>
            )}
            {(page > 1 || hasNext) && (
              <nav aria-label={t("pages")}>
                <HStack gap={2}>
                  {page > 1 && <Button label={t("previous")} href={href({ page: page - 1 })} />}
                  {hasNext && <Button label={t("next")} href={href({ page: page + 1 })} />}
                </HStack>
              </nav>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
