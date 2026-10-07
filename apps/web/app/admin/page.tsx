import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { requireAdmin } from "../../lib/admin/guard";
import { InstrumentsIcon, InviteCodeIcon, ReportIcon } from "../_components/ActionIcons";
import { AdminHeader } from "./AdminHeader";

/**
 * The Admin's Overview (Design Handoff 2.0 screen 11, SPEC-07): one card per area, with its live
 * count; a warning dot marks the area that needs attention.
 */
export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const [instruments, codes, reports] = await Promise.all([
    supabase.from("instruments").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("invite_codes").select("max_uses, uses").is("revoked_at", null).limit(1000),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const activeCodes = (codes.data ?? []).filter(
    (code) => code.max_uses === null || code.uses < code.max_uses,
  ).length;
  const openReports = reports.count ?? 0;
  const t = await getTranslations("admin");

  const areas: {
    key: "instruments" | "invites" | "reports";
    href: string;
    icon: ReactNode;
    count: string;
    attention: boolean;
  }[] = [
    {
      key: "instruments",
      href: "/admin/instruments",
      icon: <InstrumentsIcon />,
      count: t("instruments.count", { count: instruments.count ?? 0 }),
      attention: false,
    },
    {
      key: "invites",
      href: "/admin/invites",
      icon: <InviteCodeIcon />,
      count: t("invites.count", { count: activeCodes }),
      attention: false,
    },
    {
      key: "reports",
      href: "/admin/reports",
      icon: <ReportIcon />,
      count: t("reports.count", { count: openReports }),
      attention: openReports > 0,
    },
  ];

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={960}
      header={
        <AdminHeader
          area={{ label: t("title"), isLink: false }}
          title={t("overview")}
          description={t("description")}
        />
      }
      content={
        <LayoutContent>
          <Grid columns={{ minWidth: 240 }} gap={4}>
            {areas.map((area) => (
              <Card key={area.key}>
                <section aria-labelledby={`area-${area.key}`}>
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center" hAlign="between">
                      {area.icon}
                      <HStack gap={1.5} vAlign="center">
                        {area.attention && <StatusDot variant="warning" label={t("attention")} />}
                        <Text type="supporting">{area.count}</Text>
                      </HStack>
                    </HStack>
                    <VStack gap={1}>
                      <Heading level={2} id={`area-${area.key}`}>
                        {t(`${area.key}.title`)}
                      </Heading>
                      <Text color="secondary">{t(`${area.key}.hint`)}</Text>
                    </VStack>
                    <HStack>
                      <Button label={t(`${area.key}.openArea`)} href={area.href} />
                    </HStack>
                  </VStack>
                </section>
              </Card>
            ))}
          </Grid>
        </LayoutContent>
      }
    />
  );
}
