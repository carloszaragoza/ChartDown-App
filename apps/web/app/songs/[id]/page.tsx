import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Heading } from "@astryxdesign/core/Heading";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";

interface Listed {
  id: string;
  author_name: string;
  status: "active" | "frozen" | "hidden";
  source_type: "studio" | "live" | "acoustic" | "own_arrangement";
  source_album: string | null;
  source_year: number | null;
}

/**
 * A song and its public versions, to open one (R-02.9; Design Handoff 2.0, the screens table:
 * Song). Private versions never appear (R-02.5).
 */
export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: song }, { data }] = await Promise.all([
    supabase.from("songs").select("id, title, artists").eq("id", id).maybeSingle(),
    // The same rule as the catalog: public versions, active or frozen.
    supabase
      .from("versions")
      .select("id, author_name, status, source_type, source_album, source_year")
      .eq("song_id", id)
      .eq("visibility", "public")
      .in("status", ["active", "frozen"])
      .order("created_at"),
  ]);
  const versions = (data ?? []) as Listed[];
  if (!song || versions.length === 0) notFound();
  const t = await getTranslations("catalog");
  const v = await getTranslations("version");

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href="/catalog">{t("title")}</BreadcrumbItem>
              <BreadcrumbItem>{song.title}</BreadcrumbItem>
            </Breadcrumbs>
            <Heading level={1}>{song.title}</Heading>
            <Text color="secondary">
              {[song.artists.join(", "), t("versions", { count: versions.length })]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <List
            hasDividers
            edgeCompensation="inline"
            header={
              <Text className="cd-visually-hidden">{t("versionsOf", { title: song.title })}</Text>
            }
          >
            {versions.map((version) => (
              <Item
                key={version.id}
                as="li"
                href={`/versions/${version.id}`}
                startContent={
                  <Token
                    label={[v(`source.${version.source_type}`), version.source_year]
                      .filter(Boolean)
                      .join(" ")}
                    size="sm"
                  />
                }
                label={v("by", { author: version.author_name })}
                {...(version.source_album
                  ? { description: v("album", { album: version.source_album }) }
                  : {})}
                {...(version.status === "frozen"
                  ? { endContent: <Token label={v("frozen")} size="sm" /> }
                  : {})}
              />
            ))}
          </List>
        </LayoutContent>
      }
    />
  );
}
