import { keyName, parse } from "chartdown";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { tempoLabel, unitKey } from "../../../lib/chart/tempo";
import { createClient, readUser } from "../../../lib/supabase/server";
import { AddIcon, VisibilityIcon } from "../../_components/ActionIcons";
import { LinkRow } from "../../_components/LinkRow";
import { LiveSearch } from "../../_components/LiveSearch";

type One<T> = T | T[] | null;
interface Row {
  id: string;
  visibility: "public" | "private";
  status: "active" | "frozen" | "hidden";
  updated_at: string;
  current_revision_id: string | null;
  song: One<{ title: string }>;
}

const PAGE_SIZE = 50;
// Typed text is matched literally, never as a pattern.
const literal = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

/**
 * The Chart editor's list (owner's review, November 1, 2026, T-3050): the person's own versions.
 * A row opens the editor. The line under the title is the key, the meter, the tempo and the date.
 * Public or private is an icon, named for the reader. Director's notes are not on this list.
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
    .select(
      `id, visibility, status, updated_at, current_revision_id, song:songs${query ? "!inner" : ""}(title)`,
    )
    .eq("owner_id", auth.user.id);
  if (query) request = request.ilike("songs.title", `%${literal(query)}%`);
  // One more than a page, to know whether there is a next one.
  const { data, error } = await request
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const found = (data ?? []) as Row[];
  const hasNext = found.length > PAGE_SIZE;
  const versions = found.slice(0, PAGE_SIZE);
  const currentIds = versions
    .map((row) => row.current_revision_id)
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
      ] as const;
    }),
  );
  const href = (to: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (to > 1) params.set("page", String(to));
    const text = params.toString();
    return text ? `/versions/mine?${text}` : "/versions/mine";
  };
  const t = await getTranslations("mine");
  const c = await getTranslations("catalog");
  const chartWords = await getTranslations("chart");
  const format = await getFormatter();
  const title = (row: Row) =>
    (Array.isArray(row.song) ? row.song[0]?.title : row.song?.title) ?? "";
  const line = (row: Row) => {
    const chart = row.current_revision_id ? charts.get(row.current_revision_id) : undefined;
    const played = chart
      ? [
          `${c("key")} ${chart.key}`,
          chart.meter,
          chart.tempo &&
            `${chartWords("tempo")} ${tempoLabel(chart.tempo, (unit) => chartWords(`beatUnit.${unitKey(unit)}`))}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    const when = t("updated", {
      when: format.dateTime(new Date(row.updated_at), { dateStyle: "medium" }),
    });
    return [played, when].filter(Boolean).join(" · ");
  };

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
            <HStack gap={2} vAlign="center" wrap="wrap">
              <LiveSearch path="/versions/mine" query={query} label={t("search")} />
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
          <VStack gap={4}>
            {error ? (
              <div role="alert">
                <EmptyState title={t("error")} />
              </div>
            ) : versions.length === 0 && query ? (
              <EmptyState title={t("none")} />
            ) : versions.length === 0 ? (
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                actions={
                  <Button
                    label={t("newVersion")}
                    variant="primary"
                    href="/versions/new"
                    icon={<AddIcon />}
                  />
                }
              />
            ) : (
              <List density="spacious" edge="outset">
                {versions.map((row) => (
                  <LinkRow
                    key={row.id}
                    href={
                      row.status === "active" ? `/versions/${row.id}/edit` : `/versions/${row.id}`
                    }
                    title={title(row)}
                    description={
                      <HStack gap={2} vAlign="center">
                        <VisibilityIcon
                          kind={row.visibility === "private" ? "private" : "public"}
                          label={row.visibility === "private" ? t("private") : t("public")}
                        />
                        <Text type="supporting" color="secondary">
                          {line(row)}
                        </Text>
                      </HStack>
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
