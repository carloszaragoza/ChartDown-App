import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient, readUser } from "../../../../lib/supabase/server";
import { makePrivate } from "../actions";
import { loadVersion } from "../load";

/** The owner confirms making a public version private, knowing what happens (R-02.4). */
export default async function MakePrivatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    readUser(supabase),
  ]);
  if (
    !version ||
    !auth.user ||
    auth.user.id !== version.ownerId ||
    version.visibility !== "public" ||
    version.status !== "active"
  )
    notFound();
  const { error } = await searchParams;
  const t = await getTranslations("makePrivate");

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={640}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href={`/versions/${version.id}`}>{version.title}</BreadcrumbItem>
              <BreadcrumbItem>{t("title")}</BreadcrumbItem>
            </Breadcrumbs>
            <Heading level={1}>{t("title")}</Heading>
            <Text color="secondary">{version.title}</Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {error && <Banner status="error" title={t("error")} />}
            <Card>
              <VStack gap={4}>
                <Heading level={2}>{t("consequences")}</Heading>
                <List listStyle="disc">
                  <li>
                    <Text>{t("copy")}</Text>
                  </li>
                  <li>
                    <Text>{t("frozen", { author: version.author })}</Text>
                  </li>
                  <li>
                    <Text>{t("others")}</Text>
                  </li>
                  <li>
                    <Text>{t("final")}</Text>
                  </li>
                </List>
                <HStack gap={2}>
                  <form action={makePrivate}>
                    <input type="hidden" name="versionId" value={version.id} />
                    <Button type="submit" variant="primary" label={t("confirm")} />
                  </form>
                  <Button label={t("cancel")} variant="ghost" href={`/versions/${version.id}`} />
                </HStack>
              </VStack>
            </Card>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
