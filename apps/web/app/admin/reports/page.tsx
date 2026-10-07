import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import { HideIcon, ReportIcon, ShowIcon } from "../../_components/ActionIcons";
import { PageTabs } from "../../_components/PageTabs";
import { AdminHeader } from "../AdminHeader";
import { dismissReport, hideVersion, showVersion } from "./actions";

type Search = Promise<{
  tab?: string;
  hidden?: string;
  shown?: string;
  dismissed?: string;
  error?: string;
}>;
type One<T> = T | T[] | null;
type Source = "studio" | "live" | "acoustic" | "own_arrangement";
interface VersionRow {
  id: string;
  author_name: string;
  source_type: Source;
  song: One<{ title: string }>;
}
interface ReportRow {
  id: string;
  reason: "lyrics" | "other";
  note: string | null;
  created_at: string;
  reporter: One<{ name: string | null }>;
  version: One<VersionRow>;
}
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
const VERSION = "id, author_name, source_type, song:songs(title)";

/**
 * Reports (Design Handoff 2.0 screen 14, T-1103, R-07.2): two tabs that live in the address.
 * Open reports, oldest first, one item each, to view the version, dismiss the report or hide the
 * version; and hidden versions, to show again.
 */
export default async function AdminReportsPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const [{ data: reports }, { data: hidden }] = await Promise.all([
    supabase
      .from("reports")
      .select(
        `id, reason, note, created_at, reporter:profiles!reports_reporter_id_fkey(name), version:versions(${VERSION})`,
      )
      .eq("status", "open")
      .order("created_at"),
    supabase
      .from("versions")
      .select(VERSION)
      .eq("status", "hidden")
      .order("updated_at", { ascending: false }),
  ]);
  const open = (reports ?? []) as unknown as ReportRow[];
  const hiddenVersions = (hidden ?? []) as unknown as VersionRow[];
  const t = await getTranslations("admin.reports");
  const admin = await getTranslations("admin");
  const sources = await getTranslations("version.source");
  const format = await getFormatter();
  const search = await searchParams;
  const tab = search.tab === "hidden" ? "hidden" : "open";
  const titleOf = (version: VersionRow) => one(version.song)?.title ?? "";
  const byLine = (version: VersionRow) =>
    t("by", { source: sources(version.source_type), author: version.author_name });
  const status = search.hidden
    ? t("hiddenDone", { title: search.hidden })
    : search.shown
      ? t("shownDone", { title: search.shown })
      : search.dismissed
        ? t("dismissedDone")
        : null;

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={960}
      header={
        <AdminHeader
          area={{ label: admin("title"), isLink: true }}
          title={t("title")}
          description={t("description")}
          tabs={
            <PageTabs
              current={tab}
              tabs={[
                {
                  value: "open",
                  label: t("openTab", { count: open.length }),
                  href: "/admin/reports",
                },
                {
                  value: "hidden",
                  label: t("hiddenTab", { count: hiddenVersions.length }),
                  href: "/admin/reports?tab=hidden",
                },
              ]}
            />
          }
        />
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {status && <Banner status="success" title={status} />}
            {search.error && <Banner status="error" title={t("failed")} />}

            {tab === "open" &&
              (open.length === 0 ? (
                <EmptyState
                  title={t("none")}
                  description={t("noneDescription")}
                  icon={<ReportIcon />}
                />
              ) : (
                <List aria-label={t("open")}>
                  {open.map((report) => {
                    const version = one(report.version);
                    if (!version) return null;
                    const title = titleOf(version);
                    const reporter = one(report.reporter)?.name;
                    const date = format.dateTime(new Date(report.created_at), {
                      dateStyle: "medium",
                    });
                    return (
                      <ListItem
                        key={report.id}
                        startContent={<ReportIcon />}
                        label={title}
                        description={
                          <VStack gap={1}>
                            <Text type="supporting">{byLine(version)}</Text>
                            <HStack gap={2} vAlign="center" wrap="wrap">
                              <Token
                                label={t(`reasons.${report.reason}`)}
                                size="sm"
                                color={report.reason === "lyrics" ? "orange" : "gray"}
                              />
                              <Text type="supporting">
                                {reporter
                                  ? t("reportedOn", { name: reporter, date })
                                  : t("reportedOnNoName", { date })}
                              </Text>
                            </HStack>
                            {report.note && <Text>“{report.note}”</Text>}
                          </VStack>
                        }
                        endContent={
                          <HStack gap={2} vAlign="center" wrap="wrap">
                            <Button
                              label={t("viewOf", { title })}
                              href={`/versions/${version.id}`}
                              variant="ghost"
                            >
                              {t("view")}
                            </Button>
                            <form action={dismissReport}>
                              <input type="hidden" name="reportId" value={report.id} />
                              <Button type="submit" label={t("dismissOf", { title })}>
                                {t("dismiss")}
                              </Button>
                            </form>
                            <form action={hideVersion}>
                              <input type="hidden" name="versionId" value={version.id} />
                              <input type="hidden" name="title" value={title} />
                              <Button
                                type="submit"
                                variant="destructive"
                                icon={<HideIcon />}
                                label={t("hide", { title })}
                              >
                                {t("hideShort")}
                              </Button>
                            </form>
                          </HStack>
                        }
                      />
                    );
                  })}
                </List>
              ))}

            {tab === "hidden" &&
              (hiddenVersions.length === 0 ? (
                <EmptyState title={t("noneHidden")} description={t("noneHiddenDescription")} />
              ) : (
                <List aria-label={t("hidden")}>
                  {hiddenVersions.map((version) => {
                    const title = titleOf(version);
                    return (
                      <ListItem
                        key={version.id}
                        label={title}
                        description={byLine(version)}
                        endContent={
                          <HStack gap={2} vAlign="center">
                            <Button
                              label={t("viewOf", { title })}
                              href={`/versions/${version.id}`}
                              variant="ghost"
                            >
                              {t("view")}
                            </Button>
                            <form action={showVersion}>
                              <input type="hidden" name="versionId" value={version.id} />
                              <input type="hidden" name="title" value={title} />
                              <Button
                                type="submit"
                                icon={<ShowIcon />}
                                label={t("show", { title })}
                              >
                                {t("showShort")}
                              </Button>
                            </form>
                          </HStack>
                        }
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
