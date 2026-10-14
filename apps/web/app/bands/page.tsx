import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { localToday } from "../../lib/sets/today";
import { nextSet, setWhen } from "../../lib/sets/when";
import { createClient } from "../../lib/supabase/server";
import { Invitations, type Invitation } from "../_components/Invitations";
import { NameForm } from "../_components/NameForm";
import { createBand } from "./actions";

type Search = Promise<{ error?: string; left?: string; declined?: string }>;
interface Membership {
  role: "md" | "musician";
  band:
    | { id: string; name: string; is_personal: boolean }
    | { id: string; name: string; is_personal: boolean }[]
    | null;
}

/**
 * The person's bands with their role in each, their invitations, and a new band (R-04.1, R-04.5,
 * R-04.7; Design Handoff 2.0 screen 08). Personal space is a private row of its own.
 */
export default async function BandsPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/bands");

  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    supabase
      .from("band_members")
      .select("role, band:bands(id, name, is_personal)")
      .eq("user_id", auth.user.id),
    supabase.rpc("my_invitations"),
  ]);
  // The personal space is not a band to list (R-04.7).
  const all = ((memberships ?? []) as Membership[]).map((row) => ({
    role: row.role,
    band: Array.isArray(row.band) ? row.band[0] : row.band,
  }));
  const personal = all.find((row) => row.band?.is_personal)?.band;
  const bands = all
    .filter((row) => row.band && !row.band.is_personal)
    .sort((a, b) => (a.band?.name ?? "").localeCompare(b.band?.name ?? ""));
  const search = await searchParams;
  const t = await getTranslations("bands");
  const s = await getTranslations("sets");
  const format = await getFormatter();

  // Each band's members and its next set, read with the person's own permissions.
  const ids = all.flatMap((row) => (row.band ? [row.band.id] : []));
  const [{ data: memberRows }, { data: setRows }] = ids.length
    ? await Promise.all([
        supabase.from("band_members").select("band_id").in("band_id", ids),
        supabase.from("sets").select("id, band_id, name, date, time").in("band_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const today = await localToday();
  const membersOf = (bandId: string) =>
    (memberRows ?? []).filter((row) => row.band_id === bandId).length;
  const nextOf = (bandId: string) => {
    const next = nextSet(
      (setRows ?? []).filter((row) => row.band_id === bandId) as {
        name: string;
        date: string | null;
        time: string | null;
      }[],
      today,
    );
    return next
      ? s("nextSet", {
          name: next.name,
          when: setWhen(format, next.date, next.time) ?? s("noDate"),
        })
      : null;
  };
  const rowOf = (band: { id: string; name: string }, role: "md" | "musician") => (
    <Item
      key={band.id}
      as="li"
      startContent={<Avatar name={band.name} shape="rounded" tooltip={false} />}
      label={<Link href={`/bands/${band.id}`}>{band.name}</Link>}
      description={[t("members", { count: membersOf(band.id) }), nextOf(band.id)]
        .filter(Boolean)
        .join(" · ")}
      endContent={
        <HStack gap={2} vAlign="center">
          <Token label={role === "md" ? t("md") : t("musician")} size="sm" />
          <Button label={t("setsOf", { band: band.name })} href={`/bands/${band.id}/sets`}>
            {t("sets")}
          </Button>
        </HStack>
      }
    />
  );

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Heading level={1}>{t("title")}</Heading>
            <Text color="secondary">{t("description")}</Text>
          </VStack>
        </LayoutHeader>
      }
      end={
        <LayoutPanel width={340} hasDivider role="region" label={t("create")}>
          <VStack gap={3}>
            <Heading level={2}>{t("create")}</Heading>
            <NameForm
              action={createBand}
              label={t("name")}
              description={t("createHint")}
              submit={t("createButton")}
            />
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>
            {(search.left || search.declined) && (
              <Banner status="success" title={search.left ? t("left") : t("declined")} />
            )}
            {search.error && (
              <Banner
                status="error"
                title={search.error === "name" ? t("errors.name") : t("errors.unknown")}
              />
            )}
            <Invitations invitations={(invitations ?? []) as Invitation[]} />
            <section aria-labelledby="my-bands">
              <VStack gap={2}>
                <Heading level={2} id="my-bands">
                  {t("mine")}
                </Heading>
                <List hasDividers edgeCompensation="inline">
                  {bands.map(({ role, band }) => (band ? rowOf(band, role) : null))}
                  {personal && (
                    <Item
                      as="li"
                      startContent={<Avatar name={t("personal")} shape="rounded" tooltip={false} />}
                      label={<Link href={`/bands/${personal.id}/sets`}>{t("personal")}</Link>}
                      description={[t("personalHint"), nextOf(personal.id)]
                        .filter(Boolean)
                        .join(" · ")}
                      endContent={
                        <HStack gap={2} vAlign="center">
                          <Token label={t("onlyYou")} size="sm" />
                          <Button label={t("mySets")} href={`/bands/${personal.id}/sets`}>
                            {t("sets")}
                          </Button>
                        </HStack>
                      }
                    />
                  )}
                </List>
                {bands.length === 0 && <Text color="secondary">{t("none")}</Text>}
              </VStack>
            </section>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
