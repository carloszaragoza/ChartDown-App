import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { loadVersion } from "../load";

type Search = Promise<{ restored?: string; as?: string }>;
interface Revision {
  id: string;
  number: number;
  created_at: string;
  restored_from_id: string | null;
  author: { name: string } | { name: string }[] | null;
}

/** A version's revisions, newest first, for its owner only (R-02.8). */
export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!version || !auth.user || auth.user.id !== version.ownerId) notFound();

  const { data } = await supabase
    .from("revisions")
    .select("id, number, created_at, restored_from_id, author:profiles(name)")
    .eq("version_id", version.id)
    .order("number", { ascending: false });
  const revisions = (data ?? []) as Revision[];
  const numberOf = new Map(revisions.map((revision) => [revision.id, revision.number]));
  const { restored, as } = await searchParams;
  const t = await getTranslations("history");
  const c = await getTranslations("catalog");
  const format = await getFormatter();

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
                <BreadcrumbItem href={`/versions/${version.id}`}>{version.title}</BreadcrumbItem>
                <BreadcrumbItem>{t("title")}</BreadcrumbItem>
              </Breadcrumbs>
              <Heading level={1}>{t("title")}</Heading>
              <Text color="secondary">{version.title}</Text>
            </VStack>
            <Button label={t("back")} href={`/versions/${version.id}`} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {restored && as && (
              <Banner status="success" title={t("restored", { number: restored, as })} />
            )}
            <List
              listStyle="none"
              hasDividers
              edgeCompensation="inline"
              header={<Text className="cd-visually-hidden">{t("title")}</Text>}
            >
              {revisions.map((revision) => {
                const author = Array.isArray(revision.author)
                  ? revision.author[0]
                  : revision.author;
                const from = revision.restored_from_id && numberOf.get(revision.restored_from_id);
                return (
                  <Item
                    key={revision.id}
                    as="li"
                    label={
                      <Link href={`/versions/${version.id}/revisions/${revision.number}`}>
                        {t("revision", { number: revision.number })}
                      </Link>
                    }
                    description={`${format.dateTime(new Date(revision.created_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })} UTC · ${author?.name ?? "ChartDown"}${
                      from ? ` · ${t("restoredFrom", { number: from })}` : ""
                    }`}
                    {...(revision.id === version.currentRevisionId
                      ? { endContent: <Token label={t("current")} size="sm" /> }
                      : {})}
                  />
                );
              })}
            </List>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
