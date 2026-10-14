import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient, readUser } from "../../lib/supabase/server";
import { SetList } from "./SetList";

type One<T> = T | T[] | null;
interface Row {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  type: "rehearsal" | "service" | "concert";
  band: One<{ name: string; is_personal: boolean }>;
}

/**
 * Sets in the side navigation (T-706; Design Handoff 2.0, the screens table: Sets): the upcoming
 * and past sets of every band the person is in, their personal space included. Which sets they
 * see is decided by row-level security.
 */
export default async function AllSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ when?: string }>;
}) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await readUser(supabase);
  if (!auth.user) redirect("/auth/sign-in?next=/sets");
  const { data } = await supabase
    .from("sets")
    .select("id, name, date, time, type, band:bands(name, is_personal)");
  const t = await getTranslations("sets");
  const sets = ((data ?? []) as Row[]).map((set) => {
    const band = Array.isArray(set.band) ? set.band[0] : set.band;
    return { ...set, band: band?.is_personal ? t("mySets") : (band?.name ?? "") };
  });
  const { when } = await searchParams;

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader>
          <VStack gap={1}>
            <Heading level={1}>{t("allSets")}</Heading>
            <Text color="secondary">{t("allSetsHint")}</Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <SetList sets={sets} path="/sets" when={when} />
        </LayoutContent>
      }
    />
  );
}
