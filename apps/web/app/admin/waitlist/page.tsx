import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { VStack } from "@astryxdesign/core/VStack";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import { PageTabs } from "../../_components/PageTabs";
import { CopyCode } from "../AdminControls";
import { AdminHeader } from "../AdminHeader";
import { inviteFromWaitlist } from "./actions";

type Search = Promise<{ tab?: string; invited?: string; error?: string }>;
interface Entry {
  id: string;
  email: string;
  language: "en" | "es";
  created_at: string;
  invited_at: string | null;
  code: { code: string } | { code: string }[] | null;
}
const codeOf = (entry: Entry) =>
  (Array.isArray(entry.code) ? entry.code[0] : entry.code)?.code ?? null;

/**
 * The waitlist (R-07.5, T-1104): the people waiting, oldest first, each with Invite, which makes
 * a single-use code noted with their email; and those already invited, with their code to copy.
 */
export default async function AdminWaitlistPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("waitlist")
    .select("id, email, language, created_at, invited_at, code:invite_codes(code)")
    .order("created_at", { ascending: true })
    .limit(500);
  const entries = (data ?? []) as unknown as Entry[];
  const waiting = entries.filter((entry) => !entry.invited_at);
  const invited = entries
    .filter((entry) => entry.invited_at)
    .sort((a, b) => (b.invited_at ?? "").localeCompare(a.invited_at ?? ""));
  const t = await getTranslations("admin.waitlist");
  const admin = await getTranslations("admin");
  const format = await getFormatter();
  const search = await searchParams;
  const tab = search.tab === "invited" ? "invited" : "waiting";
  const shown = tab === "invited" ? invited : waiting;
  const date = (at: string) => format.dateTime(new Date(at), { dateStyle: "medium" });

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
                  value: "waiting",
                  label: t("waitingTab", { count: waiting.length }),
                  href: "/admin/waitlist",
                },
                {
                  value: "invited",
                  label: t("invitedTab", { count: invited.length }),
                  href: "/admin/waitlist?tab=invited",
                },
              ]}
            />
          }
        />
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {search.invited && (
              <Banner status="success" title={t("invitedDone", { code: search.invited })} />
            )}
            {search.error && <Banner status="error" title={t("failed")} />}
            {shown.length === 0 ? (
              <EmptyState
                title={tab === "invited" ? t("noneInvited") : t("noneWaiting")}
                isCompact
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>{t("emailColumn")}</TableHeaderCell>
                    <TableHeaderCell>{t("languageColumn")}</TableHeaderCell>
                    <TableHeaderCell>{t("joinedColumn")}</TableHeaderCell>
                    {tab === "invited" ? (
                      <>
                        <TableHeaderCell>{t("invitedColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("codeColumn")}</TableHeaderCell>
                      </>
                    ) : (
                      <TableHeaderCell>
                        <VisuallyHidden>{t("actionsColumn")}</VisuallyHidden>
                      </TableHeaderCell>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((entry) => {
                    const code = codeOf(entry);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Text>{entry.email}</Text>
                        </TableCell>
                        <TableCell>
                          <Text>{t(`languages.${entry.language}`)}</Text>
                        </TableCell>
                        <TableCell>
                          <Text>{date(entry.created_at)}</Text>
                        </TableCell>
                        {tab === "invited" ? (
                          <>
                            <TableCell>
                              <Text>{entry.invited_at ? date(entry.invited_at) : ""}</Text>
                            </TableCell>
                            <TableCell>
                              {code && (
                                <HStack gap={1} vAlign="center">
                                  <Text type="code" weight="bold">
                                    {code}
                                  </Text>
                                  <CopyCode
                                    code={code}
                                    copy={t("copy", { code })}
                                    copied={t("copied", { code })}
                                  />
                                </HStack>
                              )}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell>
                            <form action={inviteFromWaitlist}>
                              <input type="hidden" name="id" value={entry.id} />
                              <Button
                                type="submit"
                                size="sm"
                                label={t("invite", { email: entry.email })}
                              >
                                {t("inviteShort")}
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
