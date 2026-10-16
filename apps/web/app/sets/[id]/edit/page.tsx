import { keyName, parse } from "chartdown";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { effectiveLineup } from "../../../../lib/sets/lineup";
import { setWhen } from "../../../../lib/sets/when";
import { createClient, readUser } from "../../../../lib/supabase/server";
import { keysInMode } from "../../../versions/[id]/display";
import { UUID } from "../../../versions/[id]/load";
import { SET_TYPES, type SetType } from "../../../../lib/sets/types";
import { NameForm } from "../../../_components/NameForm";
import { duplicateSet, removeTempMd, resetLineup, updatePinned, updateSet } from "../../actions";
import { SetForm } from "../../SetForm";
import { ArrangedSongs } from "./ArrangedSongs";
import { DeleteSetForm, KeySelect, LineupForm, TempMdForm } from "./EditControls";
import { PageLayout } from "../../../_components/PageLayout";
import { guessPhone } from "../../../../lib/shell/guessPhone";

type Search = Promise<Record<string, string | undefined>>;
type One<T> = T | T[] | null;
interface Item {
  id: string;
  position: number;
  set_key: string | null;
  version: One<{
    id: string;
    author_name: string;
    current_revision_id: string | null;
    song: One<{ title: string }>;
  }>;
  pinned_revision_id: string;
  revision: One<{ number: number; content: string }>;
}
interface Member {
  id: string;
  user_id: string;
  profile: One<{ name: string }>;
  instruments: { instrument_id: string }[];
}
interface CatalogInstrument {
  id: string;
  name_en: string;
  name_es: string;
  active: boolean;
}
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
const STATUS = [
  "created",
  "saved",
  "added",
  "moved",
  "removed",
  "duplicated",
  "lineup",
  "defaults",
  "key",
  "updated",
  "appointed",
  "unappointed",
];
const ERRORS = new Set([
  "name",
  "date",
  "type",
  "name_taken",
  "confirm",
  "key",
  "temp_md",
  "time",
  "time_needs_date",
]);

/**
 * Arranging a set (Design Handoff 2.0, the screens table: Edit set): its songs in order, each
 * pinned to a revision (R-05.2), with their keys; the lineup and the temporary MD in the panel;
 * and, below, its details, Duplicate and Delete (R-05.1, R-05.6). Those who don't arrange it read
 * it on its own page.
 */
export default async function SetPage({
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
  const { data: auth } = await readUser(supabase);
  if (!auth.user) notFound();
  const { data: set } = await supabase
    .from("sets")
    .select("id, band_id, name, date, time, type, band:bands(name, is_personal)")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();
  const [
    { data: memberRows },
    { data: rows },
    { data: lineupRows },
    { data: tempMd },
    { data: catalog },
  ] = await Promise.all([
    supabase
      .from("band_members")
      .select(
        "id, user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
      )
      .eq("band_id", set.band_id)
      .order("joined_at"),
    supabase
      .from("set_items")
      .select(
        "id, position, set_key, pinned_revision_id, version:versions(id, author_name, current_revision_id, song:songs(title)), revision:revisions(number, content)",
      )
      .eq("set_id", id)
      .order("position"),
    supabase.from("set_lineup").select("member_id, instrument_id").eq("set_id", id),
    supabase.from("set_temp_md").select("member_id, until").eq("set_id", id).maybeSingle(),
    supabase.from("instruments").select("id, name_en, name_es, active"),
  ]);
  const members = (memberRows ?? []) as (Member & { role: "md" | "musician" })[];
  const me = members.find((member) => member.user_id === auth.user.id);
  const isMd = me?.role === "md";
  // The set's temporary MD edits its order, keys and lineup too (R-05.5, T-705).
  const today = new Date().toISOString().slice(0, 10);
  const isTempMd =
    Boolean(me && tempMd && tempMd.member_id === me.id) &&
    (!tempMd?.until || (tempMd.until as string) >= today);
  const canArrange = isMd || isTempMd;
  // Only those who arrange the set edit it; everyone else reads it on its own page (T-706).
  if (!canArrange) redirect(`/sets/${set.id}`);
  const tempMember = members.find((member) => member.id === tempMd?.member_id);
  const tempUntil = tempMd?.until
    ? (await getFormatter()).dateTime(new Date(`${tempMd.until as string}T00:00:00Z`), {
        dateStyle: "medium",
        timeZone: "UTC",
      })
    : null;
  const items = (rows ?? []) as Item[];
  // Songs whose author has published a newer revision than the one pinned (decision 9.2).
  const newer = items.filter((item) => {
    const current = one(item.version)?.current_revision_id;
    return current && current !== item.pinned_revision_id;
  });
  const { data: currentRows } = newer.length
    ? await supabase
        .from("revisions")
        .select("id, number")
        .in(
          "id",
          newer.map((item) => one(item.version)?.current_revision_id as string),
        )
    : { data: [] };
  const currentNumber = new Map(
    (currentRows ?? []).map((row) => [row.id as string, row.number as number]),
  );
  const newerNumber = (item: Item) => {
    const current = one(item.version)?.current_revision_id;
    return current && current !== item.pinned_revision_id ? currentNumber.get(current) : undefined;
  };
  const charts = new Map(items.map((item) => [item.id, parse(one(item.revision)?.content ?? "")]));
  const written = (item: Item) => keyName(charts.get(item.id)?.key ?? { root: "C", minor: false });
  const minor = (item: Item) => Boolean(charts.get(item.id)?.key.minor);
  const ownLineup = (lineupRows ?? []).length > 0;
  const lineup = effectiveLineup(
    members.map((member) => ({
      id: member.id,
      defaults: member.instruments.map((row) => row.instrument_id),
    })),
    (lineupRows ?? []) as { member_id: string; instrument_id: string }[],
  );
  const lineupOf = (member: Member) => lineup.get(member.id) ?? [];
  const locale = await getLocale();
  const instruments = (catalog ?? []) as CatalogInstrument[];
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const profileName = (member: Member) => one(member.profile)?.name ?? "";
  const band = one(set.band as One<{ name: string; is_personal: boolean }>);
  const search = await searchParams;
  const status = STATUS.find((key) => search[key]);
  const t = await getTranslations("sets");
  const format = await getFormatter();
  const date = setWhen(format, set.date, set.time as string | null, "full") ?? t("noDate");
  const hidden = (itemId?: string) => (
    <>
      <input type="hidden" name="setId" value={set.id} />
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
    </>
  );

  const sortedInstruments = (plays: Set<string>) =>
    instruments
      .filter((instrument) => instrument.active || plays.has(instrument.id))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale))
      .map((instrument) => ({ id: instrument.id, name: nameOf(instrument) }));
  const everyPlays = new Set(members.flatMap((member) => lineupOf(member)));
  const typeWords = Object.fromEntries(
    SET_TYPES.map((type) => [type, t(`types.${type}`)]),
  ) as Record<SetType, string>;

  const phone = await guessPhone();
  return (
    <PageLayout
      phone={phone}
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Breadcrumbs variant="supporting">
                <BreadcrumbItem href={`/bands/${set.band_id}/sets`}>
                  {band?.is_personal ? t("mySets") : t("bandSets", { band: band?.name ?? "" })}
                </BreadcrumbItem>
                <BreadcrumbItem href={`/sets/${set.id}`}>{set.name}</BreadcrumbItem>
                <BreadcrumbItem>{t("editSet")}</BreadcrumbItem>
              </Breadcrumbs>
              <Heading level={1}>{set.name}</Heading>
              <Text color="secondary">
                {date} · {t(`types.${set.type}`)} · {band?.is_personal ? t("mySets") : band?.name}
              </Text>
            </VStack>
            <Button label={t("backToSet")} href={`/sets/${set.id}`} />
          </HStack>
        </LayoutHeader>
      }
      panel={{
        side: "end",
        width: 360,
        children: (
          <>
            <VStack gap={6}>
              <section aria-labelledby="lineup">
                <VStack gap={3}>
                  <Heading level={2} id="lineup">
                    {t("lineup")}
                  </Heading>
                  <Text type="supporting">{ownLineup ? t("lineupOwn") : t("lineupDefaults")}</Text>
                  <LineupForm
                    setId={set.id}
                    members={members.map((member) => ({
                      id: member.id,
                      name: profileName(member),
                      plays: lineupOf(member),
                      menu: t("lineupFor", { name: profileName(member) }),
                    }))}
                    instruments={sortedInstruments(everyPlays)}
                    words={{
                      save: t("lineupSave"),
                      filter: t("lineupFilter"),
                      none: t("lineupNone"),
                    }}
                  />
                  {ownLineup && (
                    <form action={resetLineup}>
                      {hidden()}
                      <Button type="submit" variant="ghost" label={t("lineupReset")} />
                    </form>
                  )}
                </VStack>
              </section>
              <Divider />
              <section aria-labelledby="temp-md">
                <VStack gap={3}>
                  <Heading level={2} id="temp-md">
                    {t("tempMd")}
                  </Heading>
                  <Text color="secondary">
                    {isTempMd
                      ? tempUntil
                        ? t("youAreTempMdUntil", { date: tempUntil })
                        : t("youAreTempMd")
                      : tempMember
                        ? tempUntil
                          ? t("tempMdIsUntil", { name: profileName(tempMember), date: tempUntil })
                          : t("tempMdIs", { name: profileName(tempMember) })
                        : t("noTempMd")}
                  </Text>
                  {isMd && (
                    <TempMdForm
                      setId={set.id}
                      musicians={members
                        .filter((member) => member.role === "musician")
                        .map((member) => ({ value: member.id, label: profileName(member) }))}
                      current={tempMember?.id ?? null}
                      until={(tempMd?.until as string | null) ?? set.date ?? null}
                      words={{
                        who: t("tempMdWho"),
                        choose: t("chooseMusician"),
                        until: t("tempMdUntil"),
                        hint: t("tempMdHint"),
                        submit: tempMember ? t("tempMdChange") : t("tempMdAppoint"),
                      }}
                    />
                  )}
                  {isMd && tempMember && (
                    <form action={removeTempMd}>
                      {hidden()}
                      <Button type="submit" variant="ghost" label={t("tempMdRemove")} />
                    </form>
                  )}
                </VStack>
              </section>
              {isMd && (
                <>
                  <Divider />
                  <section aria-labelledby="set-copy">
                    <VStack gap={3}>
                      <Heading level={2} id="set-copy">
                        {t("duplicate")}
                      </Heading>
                      <NameForm
                        action={duplicateSet}
                        hidden={{ setId: set.id }}
                        label={t("newName")}
                        defaultValue={t("copyName", { name: set.name })}
                        description={t("duplicateHint")}
                        submit={t("duplicateButton")}
                        variant="secondary"
                        isReadyAsIs
                      />
                    </VStack>
                  </section>
                  <Divider />
                  <section aria-labelledby="set-delete">
                    <VStack gap={3}>
                      <Heading level={2} id="set-delete">
                        {t("delete")}
                      </Heading>
                      <DeleteSetForm
                        setId={set.id}
                        bandId={set.band_id}
                        words={{ confirm: t("deleteConfirm"), submit: t("deleteButton") }}
                      />
                    </VStack>
                  </section>
                </>
              )}
            </VStack>
          </>
        ),
      }}
      content={
        <>
          <VStack gap={6}>
            {status && <Banner status="success" title={t(`status.${status}`)} />}
            {search.error && (
              <Banner
                status="error"
                title={t(`errors.${ERRORS.has(search.error) ? search.error : "unknown"}`)}
              />
            )}

            <section aria-labelledby="songs">
              <VStack gap={3}>
                <Heading level={2} id="songs">
                  {t("songs", { count: items.length })}
                </Heading>
                {items.length === 0 ? (
                  <EmptyState title={isMd ? t("emptyMd") : t("empty")} />
                ) : (
                  <ArrangedSongs
                    setId={set.id}
                    canRemove={isMd}
                    words={{ up: t("up"), down: t("down"), remove: t("remove") }}
                    songs={items.map((item) => {
                      const version = one(item.version);
                      const title = one(version?.song ?? null)?.title ?? "";
                      const newer = newerNumber(item);
                      return {
                        id: item.id,
                        label: <Link href={`/sets/${set.id}/songs/${item.position}`}>{title}</Link>,
                        description: (
                          <VStack gap={2}>
                            <Text type="supporting">
                              {t("by", { author: version?.author_name ?? "" })} ·{" "}
                              {t("revision", { number: one(item.revision)?.number ?? 0 })} ·{" "}
                              {item.set_key
                                ? t("inKey", { key: item.set_key, written: written(item) })
                                : t("writtenKey", { key: written(item) })}
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
                                      {hidden(item.id)}
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
                        ),
                        keySelect: (
                          <KeySelect
                            setId={set.id}
                            itemId={item.id}
                            label={t("keyFor", { title })}
                            value={item.set_key ?? ""}
                            options={[
                              { value: "", label: t("keyWritten", { key: written(item) }) },
                              ...keysInMode(minor(item)).map((key) => ({
                                value: keyName(key),
                                label: keyName(key),
                              })),
                            ]}
                          />
                        ),
                        names: {
                          up: t("upName", { title }),
                          down: t("downName", { title }),
                          remove: t("removeName", { title }),
                        },
                      };
                    })}
                  />
                )}
                {isMd && (
                  <Text type="supporting">
                    {t("addHint")} <Link href="/catalog">{t("catalog")}</Link>
                  </Text>
                )}
              </VStack>
            </section>

            {isMd && (
              <section aria-labelledby="set-settings">
                <VStack gap={4}>
                  <Heading level={2} id="set-settings">
                    {t("settings")}
                  </Heading>
                  <Card>
                    <VStack gap={3}>
                      <Heading level={3}>{t("edit")}</Heading>
                      <SetForm
                        action={updateSet}
                        hidden={{ setId: set.id }}
                        initial={{
                          name: set.name,
                          date: set.date,
                          time: set.time as string | null,
                          type: set.type,
                        }}
                        words={{
                          name: t("name"),
                          date: t("dateLabel"),
                          time: t("timeLabel"),
                          type: t("type"),
                          chooseType: t("chooseType"),
                          types: typeWords,
                          submit: t("save"),
                          missing: t("createMissing"),
                        }}
                      />
                    </VStack>
                  </Card>
                </VStack>
              </section>
            )}
          </VStack>
        </>
      }
    />
  );
}
