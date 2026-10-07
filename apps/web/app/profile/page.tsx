import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { hasInstrumentIcon, Icon } from "@chartdown/ui";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LOCALES } from "../../i18n/locales";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { PageTabs } from "../_components/PageTabs";
import { DeleteAccountForm, NoticeSwitches, ProfileForm } from "./ProfileControls";

type Search = Promise<{ saved?: string; error?: string; tab?: string }>;
interface CatalogInstrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  active: boolean;
}

// The instruments in the design's three cards; the Admin's own instruments go in a fourth.
const GROUPS = [
  { key: "rhythm", slugs: ["drums", "bass"] },
  { key: "harmony", slugs: ["keys", "guitar", "violin"] },
  { key: "voice", slugs: ["vocals", "saxophone", "trumpet", "trombone"] },
] as const;
// The notices, in the design's groups (R-09.5).
const NOTICE_GROUPS = [
  { key: "sets", types: ["lineup_added", "lineup_removed", "temp_md"] },
  { key: "songs", types: ["key_changed", "order_changed", "note_added"] },
  { key: "md", types: ["new_revision"] },
  { key: "versions", types: ["version_hidden"] },
] as const;
const PROVIDERS = ["google", "apple", "azure"] as const;

/**
 * The person's profile (Design Handoff 2.0 screen 15), in three tabs that live in the address:
 * name, language and the instruments they play (R-01.2, R-01.5); which notices they receive
 * (R-09.5); and how they sign in, and deleting the account (R-01.6).
 */
export default async function ProfilePage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/profile");

  const [{ data: profile }, { data: catalog }, { data: mine }, { data: prefs }] = await Promise.all(
    [
      supabase.from("profiles").select("name, language, role").eq("id", auth.user.id).single(),
      supabase.from("instruments").select("id, slug, name_en, name_es, active"),
      supabase.from("user_instruments").select("instrument_id").eq("user_id", auth.user.id),
      supabase
        .from("notification_prefs")
        .select("type")
        .eq("user_id", auth.user.id)
        .eq("channel", "in_app")
        .eq("active", false),
    ],
  );
  const { saved, error, tab: asked } = await searchParams;
  const tab = asked === "notices" || asked === "account" ? asked : "profile";
  const t = await getTranslations("profile");
  const languageNames = await getTranslations("language");
  const kinds = await getTranslations("notices.kinds");
  const locale = await getLocale();

  const chosen = new Set((mine ?? []).map((row) => row.instrument_id as string));
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  // Deactivated instruments are not offered, but stay on a profile that has them (R-07.3).
  const offered = ((catalog ?? []) as CatalogInstrument[])
    .filter((instrument) => instrument.active || chosen.has(instrument.id))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale));
  const asItem = (instrument: CatalogInstrument) => ({
    id: instrument.id,
    name: nameOf(instrument),
    icon: hasInstrumentIcon(instrument.slug) ? <Icon name={instrument.slug} size={20} /> : null,
    ...(!instrument.active ? { note: t("noLongerOffered") } : {}),
  });
  const grouped = new Set<string>(GROUPS.flatMap((group) => group.slugs));
  const groups = [
    ...GROUPS.map((group) => ({
      title: t(`groups.${group.key}`),
      instruments: group.slugs.flatMap((slug) => {
        const instrument = offered.find((item) => item.slug === slug);
        return instrument ? [asItem(instrument)] : [];
      }),
    })),
    {
      title: t("groups.other"),
      instruments: offered.filter((item) => !grouped.has(item.slug)).map(asItem),
    },
  ].filter((group) => group.instruments.length > 0);
  const name = profile?.name ?? "";
  const email = auth.user.email ?? "";
  const identities = (auth.user.identities ?? []).map((identity) => identity.provider);
  const facts = [
    email,
    profile?.role === "admin" ? t("roleAdmin") : t("roleMember"),
    t("instrumentCount", { count: chosen.size }),
  ].join(" · ");

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader>
          <VStack gap={4}>
            <HStack gap={4} vAlign="center">
              <Avatar name={name} size="xl" tooltip={false} />
              <VStack gap={0.5}>
                <Heading level={1}>{name}</Heading>
                <Text color="secondary">{facts}</Text>
              </VStack>
            </HStack>
            <PageTabs
              current={tab}
              tabs={[
                { value: "profile", label: t("tabs.profile"), href: "/profile" },
                { value: "notices", label: t("tabs.notices"), href: "/profile?tab=notices" },
                { value: "account", label: t("tabs.account"), href: "/profile?tab=account" },
              ]}
            />
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>
            {saved && (
              <Banner status="success" title={saved === "notices" ? t("prefsSaved") : t("saved")} />
            )}
            {error && (
              <Banner
                status="error"
                title={
                  error === "name"
                    ? t("nameRequired")
                    : error === "confirm"
                      ? t("delete.mismatch")
                      : t("error")
                }
              />
            )}

            {tab === "profile" && (
              <ProfileForm
                name={name}
                language={profile?.language ?? locale}
                languages={LOCALES.map((option) => ({
                  value: option,
                  label: languageNames(option),
                }))}
                groups={groups}
                chosen={[...chosen]}
                words={{
                  name: t("name"),
                  nameHint: t("nameHint"),
                  language: languageNames("label"),
                  languageHint: t("languageHint"),
                  instruments: t("instruments"),
                  instrumentsHint: t("instrumentsHint"),
                  save: t("save"),
                  allSaved: t("allSaved"),
                  unsaved: t("unsaved"),
                }}
              />
            )}

            {tab === "notices" && (
              <VStack gap={5}>
                <Banner status="info" title={t("prefsBannerTitle")} description={t("prefsHint")} />
                <NoticeSwitches
                  groups={NOTICE_GROUPS.map((group) => ({
                    title: t(`noticeGroups.${group.key}`),
                    kinds: group.types.map((type) => ({ type, label: kinds(type) })),
                  }))}
                  off={(prefs ?? []).map((row) => row.type as string)}
                />
                <Text type="supporting">{t("prefsAutosave")}</Text>
              </VStack>
            )}

            {tab === "account" && (
              <VStack gap={6}>
                <section aria-labelledby="sign-in-methods">
                  <VStack gap={2}>
                    <Heading level={2} id="sign-in-methods">
                      {t("signIn.title")}
                    </Heading>
                    <List hasDividers edgeCompensation="inline">
                      {PROVIDERS.filter((provider) => identities.includes(provider)).map(
                        (provider) => (
                          <Item
                            key={provider}
                            as="li"
                            label={t(`signIn.${provider}`)}
                            description={email}
                            endContent={
                              <HStack gap={1} vAlign="center">
                                <StatusDot variant="success" label={t("signIn.connected")} />
                                <Text type="supporting">{t("signIn.connected")}</Text>
                              </HStack>
                            }
                          />
                        ),
                      )}
                      <Item
                        as="li"
                        label={t("signIn.password")}
                        description={identities.includes("email") ? email : t("signIn.notSet")}
                        {...(identities.includes("email")
                          ? {
                              endContent: (
                                <HStack gap={1} vAlign="center">
                                  <StatusDot variant="success" label={t("signIn.connected")} />
                                  <Text type="supporting">{t("signIn.connected")}</Text>
                                </HStack>
                              ),
                            }
                          : {})}
                      />
                    </List>
                  </VStack>
                </section>
                <Card>
                  <section aria-labelledby="delete-title">
                    <VStack gap={3}>
                      <Heading level={2} id="delete-title">
                        {t("delete.title")}
                      </Heading>
                      <Text>{t("delete.explain")}</Text>
                      <DeleteAccountForm
                        email={email}
                        words={{ confirm: t("delete.confirm"), submit: t("delete.submit") }}
                      />
                    </VStack>
                  </section>
                </Card>
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
