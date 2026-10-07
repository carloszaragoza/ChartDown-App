import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { UUID } from "../../../versions/[id]/load";
import { createSet } from "../../../sets/actions";
import { SetForm, SET_TYPES } from "../../../sets/SetForm";
import { SetList } from "../../../sets/SetList";

type Search = Promise<{ error?: string; deleted?: string; when?: string }>;
export interface SetRow {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  type: "rehearsal" | "service" | "concert";
}
const ERRORS = new Set(["name", "date", "time", "time_needs_date", "type", "name_taken"]);

/**
 * Upcoming and past sets of a band, or of the personal space (R-05.6, R-04.7; Design Handoff 2.0
 * screen 10), and, for its MD, a new set in the panel beside them.
 */
export default async function BandSetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const [{ data: band }, { data: me }, { data: rows }] = await Promise.all([
    supabase.from("bands").select("id, name, is_personal").eq("id", id).maybeSingle(),
    supabase
      .from("band_members")
      .select("role")
      .eq("band_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.from("sets").select("id, name, date, time, type").eq("band_id", id),
  ]);
  if (!band || !me) notFound();
  const isMd = me.role === "md";
  const sets = (rows ?? []) as SetRow[];
  const { error, deleted, when } = await searchParams;
  const t = await getTranslations("sets");
  const b = await getTranslations("bands");
  const title = band.is_personal ? t("mySets") : t("bandSets", { band: band.name });

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={
        <LayoutHeader>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href="/bands">{b("title")}</BreadcrumbItem>
              {band.is_personal ? (
                <BreadcrumbItem>{b("personal")}</BreadcrumbItem>
              ) : (
                <BreadcrumbItem href={`/bands/${band.id}`}>{band.name}</BreadcrumbItem>
              )}
              {!band.is_personal && <BreadcrumbItem>{b("sets")}</BreadcrumbItem>}
            </Breadcrumbs>
            <Heading level={1}>{title}</Heading>
            {band.is_personal && (
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Token label={b("onlyYou")} size="sm" />
                <Text color="secondary">{t("personalHint")}</Text>
              </HStack>
            )}
          </VStack>
        </LayoutHeader>
      }
      {...(isMd
        ? {
            end: (
              <LayoutPanel width={360} hasDivider role="region" label={t("create")}>
                <VStack gap={3}>
                  <Heading level={2}>{t("create")}</Heading>
                  <SetForm
                    action={createSet}
                    hidden={{ bandId: band.id }}
                    words={{
                      name: t("name"),
                      date: t("dateLabel"),
                      time: t("timeLabel"),
                      type: t("type"),
                      chooseType: t("chooseType"),
                      types: Object.fromEntries(
                        SET_TYPES.map((type) => [type, t(`types.${type}`)]),
                      ) as Record<(typeof SET_TYPES)[number], string>,
                      submit: t("createButton"),
                      missing: t("createMissing"),
                    }}
                  />
                </VStack>
              </LayoutPanel>
            ),
          }
        : {})}
      content={
        <LayoutContent>
          <VStack gap={4}>
            {deleted && <Banner status="success" title={t("deleted")} />}
            {error && (
              <Banner status="error" title={t(`errors.${ERRORS.has(error) ? error : "unknown"}`)} />
            )}
            <SetList sets={sets} path={`/bands/${band.id}/sets`} when={when} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
