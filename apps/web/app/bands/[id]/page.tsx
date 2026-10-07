import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
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
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import { NameForm } from "../../_components/NameForm";
import { PageTabs } from "../../_components/PageTabs";
import { cancelInvitation, inviteMember, leaveBand, removeMember, renameBand } from "../actions";
import { InstrumentsForm } from "./InstrumentsForm";

type Search = Promise<Record<string, string | undefined>>;
interface Member {
  id: string;
  user_id: string;
  role: "md" | "musician";
  profile: { name: string } | { name: string }[] | null;
  instruments: { instrument_id: string }[];
}
interface CatalogInstrument {
  id: string;
  name_en: string;
  name_es: string;
  active: boolean;
}

const STATUS = ["created", "renamed", "invited", "cancelled", "instruments", "removed", "joined"];
const ERRORS = new Set(["name", "email_invalid", "yourself"]);
// The tab an action's answer belongs to, when the address names none.
const TAB_OF: Record<string, "invitations" | "settings"> = {
  // A new band's next step is inviting its musicians.
  created: "invitations",
  invited: "invitations",
  cancelled: "invitations",
  email_invalid: "invitations",
  yourself: "invitations",
  renamed: "settings",
  name: "settings",
};

/**
 * A band (R-04.2 to R-04.4; Design Handoff 2.0 screen 09) in three tabs that live in the address:
 * its members and their default instruments, its invitations, and its settings (the name, or
 * leaving it). Only its members see it; the MD manages it.
 */
export default async function BandPage({
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
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();

  const [{ data: band }, { data: memberRows }, { data: catalog }] = await Promise.all([
    supabase.from("bands").select("id, name, is_personal").eq("id", id).maybeSingle(),
    supabase
      .from("band_members")
      .select(
        "id, user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
      )
      .eq("band_id", id)
      .order("joined_at"),
    supabase.from("instruments").select("id, name_en, name_es, active"),
  ]);
  // A band the person is not in, and the personal space, have no page here (R-04.7).
  if (!band || band.is_personal) notFound();
  const members = (memberRows ?? []) as Member[];
  const me = members.find((member) => member.user_id === auth.user.id);
  if (!me) notFound();
  const isMd = me.role === "md";
  const { data: invitations } = isMd
    ? await supabase
        .from("band_invitations")
        .select("id, email, created_at")
        .eq("band_id", id)
        .is("responded_at", null)
        .order("created_at")
    : { data: [] };

  const t = await getTranslations("bands");
  const locale = await getLocale();
  const instruments = (catalog ?? []) as CatalogInstrument[];
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const nameById = new Map(instruments.map((instrument) => [instrument.id, nameOf(instrument)]));
  const search = await searchParams;
  const status = STATUS.find((key) => search[key]);
  const profileName = (member: Member) =>
    (Array.isArray(member.profile) ? member.profile[0]?.name : member.profile?.name) ?? "";

  const asked = search.tab ?? TAB_OF[status ?? ""] ?? TAB_OF[search.error ?? ""];
  const tab =
    asked === "settings" || (asked === "invitations" && isMd) ? asked : ("members" as const);
  const tabHref = (value: string) => `/bands/${band.id}?tab=${value}`;
  const editing = isMd ? members.find((member) => member.id === search.edit) : undefined;
  const offered = (chosen: Set<string>) =>
    instruments
      .filter((instrument) => instrument.active || chosen.has(instrument.id))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale))
      .map((instrument) => ({ id: instrument.id, name: nameOf(instrument) }));

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={960}
      header={
        <LayoutHeader>
          <VStack gap={4}>
            <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href="/bands">{t("title")}</BreadcrumbItem>
                  <BreadcrumbItem>{band.name}</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>{band.name}</Heading>
                <Text color="secondary">{isMd ? t("youAreMd") : t("youAreMusician")}</Text>
              </VStack>
              <Button label={t("sets")} variant="primary" href={`/bands/${band.id}/sets`} />
            </HStack>
            <PageTabs
              current={tab}
              tabs={[
                { value: "members", label: t("membersTab"), href: tabHref("members") },
                ...(isMd
                  ? [
                      {
                        value: "invitations",
                        label: t("invitationsTab"),
                        href: tabHref("invitations"),
                      },
                    ]
                  : []),
                { value: "settings", label: t("settingsTab"), href: tabHref("settings") },
              ]}
            />
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>
            {status && <Banner status="success" title={t(`status.${status}`)} />}
            {search.error && (
              <Banner
                status="error"
                title={t(`errors.${ERRORS.has(search.error) ? search.error : "unknown"}`)}
              />
            )}

            {tab === "members" && (
              <section aria-labelledby="members">
                <VStack gap={3}>
                  <Heading level={2} id="members">
                    {t("members", { count: members.length })}
                  </Heading>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>{t("musicianColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("roleColumn")}</TableHeaderCell>
                        <TableHeaderCell>{t("instrumentsColumn")}</TableHeaderCell>
                        {isMd && <TableHeaderCell>{t("actionsColumn")}</TableHeaderCell>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => {
                        const name = profileName(member);
                        const plays = member.instruments.map(
                          (item) => nameById.get(item.instrument_id) ?? "",
                        );
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <HStack gap={2} vAlign="center">
                                <Avatar name={name} size="sm" tooltip={false} />
                                <Text>
                                  {name}
                                  {member.user_id === auth.user.id ? ` (${t("you")})` : ""}
                                </Text>
                              </HStack>
                            </TableCell>
                            <TableCell>
                              <Token
                                label={member.role === "md" ? t("md") : t("musician")}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Text color={plays.length > 0 ? "primary" : "secondary"}>
                                {plays.length > 0 ? plays.join(", ") : t("noInstruments")}
                              </Text>
                            </TableCell>
                            {isMd && (
                              <TableCell>
                                <HStack gap={2}>
                                  <Button
                                    label={t("instrumentsOf", { name })}
                                    href={`/bands/${band.id}?tab=members&edit=${member.id}#edit-instruments`}
                                    variant="ghost"
                                  >
                                    {t("editInstruments")}
                                  </Button>
                                  {member.role === "musician" && (
                                    <form action={removeMember}>
                                      <input type="hidden" name="bandId" value={band.id} />
                                      <input type="hidden" name="memberId" value={member.id} />
                                      <Button
                                        type="submit"
                                        variant="ghost"
                                        label={t("removeName", { name })}
                                      >
                                        {t("remove")}
                                      </Button>
                                    </form>
                                  )}
                                </HStack>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {editing && (
                    <Card>
                      <section aria-labelledby="edit-instruments-title" id="edit-instruments">
                        <VStack gap={3}>
                          <Heading level={3} id="edit-instruments-title">
                            {t("instrumentsOf", { name: profileName(editing) })}
                          </Heading>
                          <InstrumentsForm
                            bandId={band.id}
                            memberId={editing.id}
                            instruments={offered(
                              new Set(editing.instruments.map((item) => item.instrument_id)),
                            )}
                            chosen={editing.instruments.map((item) => item.instrument_id)}
                            words={{
                              save: t("saveInstruments"),
                              cancel: t("cancel"),
                              cancelHref: tabHref("members"),
                            }}
                          />
                        </VStack>
                      </section>
                    </Card>
                  )}
                </VStack>
              </section>
            )}

            {tab === "invitations" && isMd && (
              <VStack gap={5}>
                <Card>
                  <VStack gap={3}>
                    <Heading level={2}>{t("invite")}</Heading>
                    <NameForm
                      action={inviteMember}
                      hidden={{ bandId: band.id }}
                      htmlName="email"
                      type="email"
                      label={t("email")}
                      description={t("inviteHint")}
                      submit={t("inviteButton")}
                    />
                  </VStack>
                </Card>
                <section aria-labelledby="pending">
                  <VStack gap={2}>
                    <Heading level={2} id="pending">
                      {t("pending")}
                    </Heading>
                    {(invitations ?? []).length === 0 ? (
                      <Text color="secondary">{t("noPending")}</Text>
                    ) : (
                      <List hasDividers edgeCompensation="inline">
                        {(invitations ?? []).map((invitation) => (
                          <Item
                            key={invitation.id as string}
                            as="li"
                            label={invitation.email as string}
                            endContent={
                              <form action={cancelInvitation}>
                                <input type="hidden" name="bandId" value={band.id} />
                                <input
                                  type="hidden"
                                  name="invitationId"
                                  value={invitation.id as string}
                                />
                                <Button
                                  type="submit"
                                  label={t("cancelFor", { email: invitation.email as string })}
                                >
                                  {t("cancel")}
                                </Button>
                              </form>
                            }
                          />
                        ))}
                      </List>
                    )}
                  </VStack>
                </section>
              </VStack>
            )}

            {tab === "settings" && (
              <VStack gap={5}>
                {isMd && (
                  <Card>
                    <VStack gap={3}>
                      <Heading level={2}>{t("rename")}</Heading>
                      <NameForm
                        action={renameBand}
                        hidden={{ bandId: band.id }}
                        label={t("name")}
                        defaultValue={band.name}
                        submit={t("renameButton")}
                        variant="secondary"
                      />
                    </VStack>
                  </Card>
                )}
                {!isMd && (
                  <Card>
                    <form action={leaveBand}>
                      <input type="hidden" name="bandId" value={band.id} />
                      <VStack gap={3}>
                        <Heading level={2}>{t("leave")}</Heading>
                        <Text color="secondary">{t("leaveHint")}</Text>
                        <HStack>
                          <Button type="submit" variant="destructive" label={t("leaveButton")} />
                        </HStack>
                      </VStack>
                    </form>
                  </Card>
                )}
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
