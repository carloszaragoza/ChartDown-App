import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { VStack } from "@astryxdesign/core/VStack";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import { CopyCode, InviteForm } from "../AdminControls";
import { AdminHeader } from "../AdminHeader";
import { createInvite, revokeInvite } from "./actions";

type Search = Promise<{ created?: string; revoked?: string; error?: string }>;
interface Code {
  id: string;
  code: string;
  kind: "single_use" | "band";
  max_uses: number | null;
  uses: number;
  note: string | null;
  created_at: string;
  revoked_at: string | null;
}
const PROBLEMS = ["uses", "note"] as const;
const STATUS_DOT = { active: "success", used: "neutral", revoked: "neutral" } as const;

/**
 * Invite codes (Design Handoff 2.0 screen 13, T-1102, R-01.7): create single-use or band codes,
 * see their uses, copy them, and revoke the active ones.
 */
export default async function AdminInvitesPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("invite_codes")
    .select("id, code, kind, max_uses, uses, note, created_at, revoked_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const codes = (data ?? []) as Code[];
  const t = await getTranslations("admin.invites");
  const admin = await getTranslations("admin");
  const format = await getFormatter();
  const { created, revoked, error } = await searchParams;
  const statusOf = (code: Code) =>
    code.revoked_at
      ? "revoked"
      : code.max_uses !== null && code.uses >= code.max_uses
        ? "used"
        : "active";

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
        />
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            {(created || revoked) && (
              <Banner
                status="success"
                title={
                  created
                    ? t("created", { code: created })
                    : t("revokedDone", { code: revoked ?? "" })
                }
              />
            )}
            {error && (
              <Banner
                status="error"
                title={
                  (PROBLEMS as readonly string[]).includes(error)
                    ? t(`problems.${error as (typeof PROBLEMS)[number]}`)
                    : t("problems.unknown")
                }
              />
            )}
            <Card>
              <VStack gap={4}>
                <Heading level={2}>{t("create")}</Heading>
                <InviteForm
                  action={createInvite}
                  words={{
                    title: t("create"),
                    kind: t("kind"),
                    single: t("kinds.single_use"),
                    band: t("kinds.band"),
                    uses: t("maxUses"),
                    usesSingle: t("usesSingle"),
                    usesBand: t("usesBand"),
                    note: t("note"),
                    notePlaceholder: t("notePlaceholder"),
                    submit: t("createSubmit"),
                  }}
                />
              </VStack>
            </Card>

            <section aria-labelledby="codes-title">
              <VStack gap={3}>
                <HStack gap={2} vAlign="center" hAlign="between">
                  <Heading level={2} id="codes-title">
                    {t("codes")}
                  </Heading>
                  <Text type="supporting">{t("codeCount", { count: codes.length })}</Text>
                </HStack>
                {codes.length === 0 ? (
                  <EmptyState title={t("none")} description={t("noneDescription")} isCompact />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>{t("codeColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("kindColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("usesColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("forColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("createdColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("statusColumn")}</TableHeaderCell>
                        <TableHeaderCell>
                          <VisuallyHidden>{t("actionsColumn")}</VisuallyHidden>
                        </TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codes.map((code) => {
                        const status = statusOf(code);
                        return (
                          <TableRow key={code.id}>
                            <TableCell>
                              <HStack gap={1} vAlign="center">
                                <Text type="code" weight="bold">
                                  {code.code}
                                </Text>
                                <CopyCode
                                  code={code.code}
                                  copy={t("copy", { code: code.code })}
                                  copied={t("copied", { code: code.code })}
                                />
                              </HStack>
                            </TableCell>
                            <TableCell>
                              <Token label={t(`kinds.${code.kind}`)} size="sm" />
                            </TableCell>
                            <TableCell>
                              <Text>
                                {code.max_uses === null
                                  ? t("usesNoLimit", { uses: code.uses })
                                  : t("uses", { uses: code.uses, max: code.max_uses })}
                              </Text>
                            </TableCell>
                            <TableCell>
                              <Text>{code.note ?? ""}</Text>
                            </TableCell>
                            <TableCell>
                              <Text>
                                {format.dateTime(new Date(code.created_at), {
                                  dateStyle: "medium",
                                })}
                              </Text>
                            </TableCell>
                            <TableCell>
                              <HStack gap={1.5} vAlign="center">
                                <StatusDot
                                  variant={STATUS_DOT[status]}
                                  label={t(`statuses.${status}`)}
                                />
                                <Text>{t(`statuses.${status}`)}</Text>
                              </HStack>
                            </TableCell>
                            <TableCell>
                              {status === "active" && (
                                <form action={revokeInvite}>
                                  <input type="hidden" name="id" value={code.id} />
                                  <Button
                                    type="submit"
                                    variant="destructive"
                                    size="sm"
                                    label={t("revoke", { code: code.code })}
                                  >
                                    {t("revokeShort")}
                                  </Button>
                                </form>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </VStack>
            </section>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
