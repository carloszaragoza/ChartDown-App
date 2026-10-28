import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { createSetHref, type StandBand } from "../../lib/sets/standEmpty";
import { localToday } from "../../lib/sets/today";
import { nextSet } from "../../lib/sets/when";
import { BAND_COOKIE } from "../../lib/shell/shell";
import { createClient, readUser } from "../../lib/supabase/server";

type One<T> = T | T[] | null;

/**
 * Stand mode in the side navigation (Design Handoff 2.0, section 4; R-05.7): opens the next set
 * from today in stand mode, or its page when it has no songs yet. With no upcoming set it stays
 * here and says so, with Create a set and See all sets: nothing redirects in silence.
 */
export default async function StandEntry() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await readUser(supabase);
  if (!auth.user) redirect("/auth/sign-in?next=/stand");
  // Row-level security returns the sets of the person's bands.
  const { data } = await supabase.from("sets").select("id, name, date, time, set_items(count)");
  type Row = {
    id: string;
    name: string;
    date: string | null;
    time: string | null;
    set_items: { count: number }[];
  };
  const next = nextSet((data ?? []) as Row[], await localToday());
  if (next)
    redirect(
      (next.set_items[0]?.count ?? 0) > 0 ? `/sets/${next.id}/songs/1/stand` : `/sets/${next.id}`,
    );

  const [{ data: memberships }, store, t] = await Promise.all([
    supabase
      .from("band_members")
      .select("role, band:bands(id, name, is_personal)")
      .eq("user_id", auth.user.id),
    cookies(),
    getTranslations("standEntry"),
  ]);
  type Band = { id: string; name: string; is_personal: boolean };
  const bands: StandBand[] = (memberships ?? []).flatMap((row) => {
    const band = row.band as One<Band>;
    const one = Array.isArray(band) ? band[0] : band;
    return one
      ? [
          {
            id: one.id,
            name: one.name,
            personal: one.is_personal,
            role: row.role as StandBand["role"],
          },
        ]
      : [];
  });
  const createHref = createSetHref(bands, store.get(BAND_COOKIE)?.value);

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader>
          <Heading level={1}>{t("title")}</Heading>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <EmptyState
            title={t("noUpcoming")}
            description={createHref ? t("why") : t("newMember")}
            actions={
              <HStack gap={2} wrap="wrap" hAlign="center">
                {createHref && (
                  <Button label={t("createSet")} href={createHref} variant="primary" />
                )}
                <Button label={t("allSets")} href="/sets" />
              </HStack>
            }
          />
        </LayoutContent>
      }
    />
  );
}
