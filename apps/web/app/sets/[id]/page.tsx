import { keyName, parse } from "chartdown";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowsPointingOutIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { effectiveLineup, setSongKey } from "../../../lib/sets/lineup";
import { songView, type SetSong } from "../../../lib/sets/song";
import { setWhen } from "../../../lib/sets/when";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import { updatePinned } from "../actions";
import { OfflineChanges } from "../../_components/OfflineChanges";
import { OfflineButton } from "./OfflineButton";

type One<T> = T | T[] | null;
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
interface Item {
  id: string;
  position: number;
  pinned_revision_id: string;
  revision: One<{ number: number }>;
  version: One<{
    id: string;
    current_revision_id: string | null;
    source_type: "studio" | "live" | "acoustic" | "own_arrangement";
    source_year: number | null;
    song: One<{ title: string }>;
  }>;
}
interface Member {
  id: string;
  user_id: string;
  role: "md" | "musician";
  profile: One<{ name: string }>;
  instruments: { instrument_id: string }[];
}
interface CatalogInstrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
}

/**
 * A set as a musician reads it (T-706; Design Handoff 2.0 screen 02): its songs in order with
 * their source, key and the notes for this person, counted by `set_song` so no other note is
 * counted (R-06.2), and the lineup. Those who arrange it go to “Edit set”.
 */
export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: set } = await supabase
    .from("sets")
    .select("id, band_id, name, date, time, type, band:bands(name, is_personal)")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();

  const [
    { data: itemRows },
    { data: memberRows },
    { data: lineupRows },
    { data: tempMd },
    { data: catalog },
  ] = await Promise.all([
    supabase
      .from("set_items")
      .select(
        "id, position, pinned_revision_id, revision:revisions(number), version:versions(id, current_revision_id, source_type, source_year, song:songs(title))",
      )
      .eq("set_id", id)
      .order("position"),
    supabase
      .from("band_members")
      .select(
        "id, user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
      )
      .eq("band_id", set.band_id)
      .order("joined_at"),
    supabase.from("set_lineup").select("member_id, instrument_id").eq("set_id", id),
    supabase.from("set_temp_md").select("member_id, until").eq("set_id", id).maybeSingle(),
    supabase.from("instruments").select("id, slug, name_en, name_es"),
  ]);
  const items = (itemRows ?? []) as Item[];
  const members = (memberRows ?? []) as Member[];
  const me = members.find((member) => member.user_id === auth.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const isTempMd =
    Boolean(me && tempMd && tempMd.member_id === me.id) &&
    (!tempMd?.until || (tempMd.until as string) >= today);
  const isMd = me?.role === "md";
  const canArrange = isMd || isTempMd;

  // Each song as this person may see it: the key it is played in and the notes for them.
  const songs = await Promise.all(
    items.map(async (item) => {
      const { data } = await supabase.rpc("set_song", {
        set_id: id,
        song_position: item.position,
      });
      if (!data) return null;
      const song = data as SetSong;
      const chart = parse(song.content);
      return {
        key: keyName(setSongKey(chart, song.set_key)),
        notes: songView(chart, song).forYou,
        leads: song.role !== "musician",
      };
    }),
  );
  // Songs whose author published a newer revision than the one pinned (decision 9.2).
  const newerIds = items
    .map((item) => one(item.version)?.current_revision_id)
    .filter((current, index): current is string =>
      Boolean(current && current !== items[index]?.pinned_revision_id),
    );
  const { data: newerRows } = newerIds.length
    ? await supabase.from("revisions").select("id, number").in("id", newerIds)
    : { data: [] };
  const newerNumber = new Map(
    (newerRows ?? []).map((row) => [row.id as string, row.number as number]),
  );

  const locale = await getLocale();
  const instruments = (catalog ?? []) as CatalogInstrument[];
  const byId = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const nameOf = (instrument: CatalogInstrument | undefined) =>
    instrument ? (locale === "es" ? instrument.name_es : instrument.name_en) : "";
  const lineup = effectiveLineup(
    members.map((member) => ({
      id: member.id,
      defaults: member.instruments.map((row) => row.instrument_id),
    })),
    (lineupRows ?? []) as { member_id: string; instrument_id: string }[],
  );

  const t = await getTranslations("sets");
  const sources = await getTranslations("version.source");
  const format = await getFormatter();
  const search = await searchParams;
  const band = one(set.band as One<{ name: string; is_personal: boolean }>);
  const when = setWhen(format, set.date, set.time as string | null, "full");
  const facts = [when, t("songs", { count: items.length })].filter(Boolean).join(" · ");
  const status = search.created ? t("status.created") : search.updated ? t("status.updated") : null;

  return (
    <Layout
      height="auto"
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">
                <Link href={`/bands/${set.band_id}/sets`}>
                  {band?.is_personal ? t("mySets") : band?.name}
                </Link>{" "}
                · {t(`types.${set.type}`)}
              </Text>
              <Heading level={1}>{set.name}</Heading>
              <Text color="secondary">{facts}</Text>
            </VStack>
            <HStack gap={2} vAlign="center" wrap="wrap">
              {items.length > 0 && <OfflineButton setId={set.id} />}
              {canArrange && (
                <Button
                  label={t("editSet")}
                  href={`/sets/${set.id}/edit`}
                  icon={<Icon icon={PencilSquareIcon} />}
                />
              )}
              {items.length > 0 && (
                <Button
                  label={t("startStand")}
                  variant="primary"
                  href={`/sets/${set.id}/songs/1/stand`}
                  icon={<Icon icon={ArrowsPointingOutIcon} />}
                />
              )}
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      end={
        <LayoutPanel width={340} hasDivider padding={4} role="region" label={t("lineup")}>
          <VStack gap={3}>
            <Heading level={2}>{t("lineup")}</Heading>
            <List>
              {members.map((member) => {
                const plays = (lineup.get(member.id) ?? []).map((instrumentId) =>
                  byId.get(instrumentId),
                );
                const name = one(member.profile)?.name ?? "";
                const role = [
                  member.role === "md" ? t("mdShort") : null,
                  plays.length > 0 ? plays.map(nameOf).join(", ") : t("sitsOut"),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Item
                    key={member.id}
                    as="li"
                    label={member.user_id === auth.user.id ? t("you", { name }) : name}
                    description={role}
                    startContent={<Avatar name={name} tooltip={false} />}
                  />
                );
              })}
            </List>
            <Text type="supporting">{t("lineupNote")}</Text>
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={4} role="region" label={t("songsTitle")}>
          <VStack gap={3}>
            <OfflineChanges setId={set.id} />
            {status && (
              <div role="status">
                <Banner status="success" title={status} />
              </div>
            )}
            {search.error && (
              <div role="alert">
                <Banner status="error" title={t("errors.unknown")} />
              </div>
            )}
            <Heading level={2}>{t("songsTitle")}</Heading>
            {items.length === 0 ? (
              <EmptyState title={canArrange ? t("emptyMd") : t("empty")} />
            ) : (
              <List
                listStyle="decimal"
                header={<Text className="cd-visually-hidden">{t("songsTitle")}</Text>}
              >
                {items.map((item, index) => {
                  const version = one(item.version);
                  const title = one(version?.song ?? null)?.title ?? "";
                  const shown = songs[index];
                  const newer = version?.current_revision_id
                    ? newerNumber.get(version.current_revision_id)
                    : undefined;
                  const forYou = shown && shown.notes > 0;
                  return (
                    <Item
                      key={item.id}
                      as="li"
                      align="start"
                      label={<Link href={`/sets/${set.id}/songs/${item.position}`}>{title}</Link>}
                      description={
                        <VStack gap={2}>
                          <Text type="supporting">
                            {[version && sources(version.source_type), version?.source_year]
                              .filter(Boolean)
                              .join(" ")}
                          </Text>
                          {newer !== undefined && (
                            <VStack gap={2}>
                              <Text>
                                {t("newer", {
                                  number: newer,
                                  pinned: one(item.revision)?.number ?? 0,
                                })}
                              </Text>
                              {isMd && (
                                <HStack gap={2} wrap="wrap">
                                  <Button
                                    label={t("seeNewerName", { title })}
                                    href={`/sets/${set.id}/songs/${item.position}?preview=new`}
                                    size="sm"
                                  >
                                    {t("seeNewer")}
                                  </Button>
                                  <form action={updatePinned}>
                                    <input type="hidden" name="setId" value={set.id} />
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <Button
                                      type="submit"
                                      variant="primary"
                                      size="sm"
                                      label={t("updateName", { title })}
                                    >
                                      {t("update")}
                                    </Button>
                                  </form>
                                </HStack>
                              )}
                            </VStack>
                          )}
                        </VStack>
                      }
                      endContent={
                        <HStack gap={2} vAlign="center">
                          <Token label={`${t("key")} ${shown?.key ?? ""}`} size="sm" />
                          {forYou ? (
                            <HStack gap={1} vAlign="center">
                              <StatusDot variant="error" label={t("notesDot")} />
                              <Text type="supporting">
                                {shown.leads
                                  ? t("notesCount", { count: shown.notes })
                                  : t("forYouCount", { count: shown.notes })}
                              </Text>
                            </HStack>
                          ) : (
                            <Text type="supporting">{t("noNotes")}</Text>
                          )}
                        </HStack>
                      }
                    />
                  );
                })}
              </List>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
