import { keyName, parse } from "chartdown";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { tempoLabel, unitKey } from "../../lib/chart/tempo";
import { createClient } from "../../lib/supabase/server";
import { SOURCE_TYPES, type SourceType } from "../../lib/versions/validate";
import { AddIcon } from "../_components/ActionIcons";
import { LiveSearch } from "../_components/LiveSearch";
import { guessPhone } from "../../lib/shell/guessPhone";
import { CatalogSources } from "./CatalogSources";
import { RememberCatalog } from "./RememberCatalog";

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
  author_name: string;
  status: "active" | "frozen" | "hidden";
  source_type: SourceType;
  current_revision_id: string | null;
}
interface ChartFacts {
  key: string;
  meter: string;
  tempo: string | null;
}

const PAGE_SIZE = 30;

/**
 * The public catalog (R-02.9, R-02.10; Design Handoff 2.0 screen 04). One list: a song with one
 * version opens from its row; a song with several opens them underneath, indented. Fork is on the
 * version, after it has been opened. Anyone may browse it (R-01.4). Which versions count is
 * decided in the database, never here (R-02.5).
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
  const { data, error } = await supabase.rpc("catalog", { query, source, page });
  const rows = (data ?? []) as Row[];
  const songs = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  // The versions of the songs on this page, with the rule of the catalog: public, active or
  // frozen, and of the chosen source.
  let versionQuery = supabase
    .from("versions")
    .select("id, song_id, author_name, status, source_type, current_revision_id")
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
  const currentIds = versions
    .map((version) => version.current_revision_id)
    .filter((id): id is string => Boolean(id));
  const { data: revisions } = currentIds.length
    ? await supabase.from("revisions").select("id, content").in("id", currentIds)
    : { data: [] };
  const charts = new Map<string, ChartFacts>(
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
  const facts = (version: Listed) => {
    const chart = version.current_revision_id ? charts.get(version.current_revision_id) : undefined;
    const played = chart
      ? [
          `${t("key")} ${chart.key}`,
          chart.meter,
          chart.tempo &&
            `${c("tempo")} ${tempoLabel(chart.tempo, (unit) => c(`beatUnit.${unitKey(unit)}`))}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
    const from = [
      sources(version.source_type),
      t("by", { author: version.author_name }),
      version.status === "frozen" ? v("frozen") : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { played, from, line: [played, from].filter(Boolean).join(" · ") };
  };
  const items: TreeListItemData[] = songs.map((song) => {
    const songVersions = versions.filter((version) => version.song_id === song.song_id);
    const several = songVersions.length > 1;
    const item: TreeListItemData = {
      id: song.song_id,
      label: song.title,
      description: several
        ? t("versions", { count: songVersions.length })
        : songVersions[0]
          ? facts(songVersions[0]).line
          : t("versions", { count: song.versions }),
    };
    if (several) {
      item.isExpanded = openSong === song.song_id;
      item.children = songVersions.map((version) => {
        const { played, from } = facts(version);
        return {
          id: version.id,
          href: `/versions/${version.id}`,
          label: (
            <Text type="supporting" color="primary" weight="medium">
              {played ?? sources(version.source_type)}
            </Text>
          ),
          description: played ? from : t("by", { author: version.author_name }),
        };
      });
    } else if (songVersions[0]) {
      item.href = `/versions/${songVersions[0].id}`;
    }
    return item;
  });
  const sourceOptions = [
    { value: "all", label: t("all") },
    ...SOURCE_TYPES.map((type) => ({ value: type, label: sources(type) })),
  ];

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
            <HStack gap={2} vAlign="center" wrap="wrap">
              <LiveSearch
                path="/catalog"
                query={query}
                params={source ? { source } : {}}
                label={t("search")}
                placeholder={t("placeholder")}
              />
              <Button
                label={t("newVersion")}
                variant="primary"
                href="/versions/new"
                icon={<AddIcon />}
              />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <CatalogSources
              query={query}
              source={source ?? "all"}
              options={sourceOptions}
              label={t("sources")}
              phone={phone}
            />
            {error ? (
              <div role="alert">
                <EmptyState title={t("error")} />
              </div>
            ) : songs.length === 0 ? (
              <EmptyState title={t("none")} />
            ) : (
              <>
                <RememberCatalog
                  url={href(openSong ? { song: openSong } : {})}
                  songs={songs.map((song) => song.song_id)}
                />
                <TreeList density="spacious" variant="noGuides" items={items} />
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
