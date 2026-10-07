"use client";

import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Item } from "@astryxdesign/core/Item";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import { VStack } from "@astryxdesign/core/VStack";
import { ChartDownLogo } from "@chartdown/ui";
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsPointingOutIcon,
  BellIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  FlagIcon,
  KeyIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  QueueListIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowsPointingOutIcon as ArrowsPointingOutSolid,
  BellIcon as BellSolid,
  BookOpenIcon as BookOpenSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  FlagIcon as FlagSolid,
  KeyIcon as KeySolid,
  MusicalNoteIcon as MusicalNoteSolid,
  PencilSquareIcon as PencilSolid,
  QueueListIcon as QueueListSolid,
  Squares2X2Icon as GridSolid,
  UserGroupIcon as UserGroupSolid,
  UserIcon as UserSolid,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useTransition, type ReactNode } from "react";
import { LOCALES } from "../../i18n/locales";
import { forgetSets } from "../../lib/offline/store";
import {
  currentBand,
  currentItem,
  shellHidden,
  versionOf,
  type NavItem,
  type ShellBand,
} from "../../lib/shell/shell";
import { setLocale } from "../actions";
import { signOut } from "../auth/actions";

export interface ShellProps {
  /** The signed-in person, or null for a visitor. */
  account: { name: string; admin: boolean; instruments: string[] } | null;
  /** Their bands, their personal space included (R-04.7). */
  bands: ShellBand[];
  /** The band chosen before, from its cookie. */
  chosenBand: string | undefined;
  /** Unread notices (T-1002) and, for admins, open reports (T-1103). */
  unread: number;
  openReports: number;
  children: ReactNode;
}

/**
 * The app shell (Design Handoff 2.0, section 4): Astryx's AppShell with the side navigation. The
 * page goes in the shell's main region. Pages that fill the screen render without it.
 */
export function Shell({ account, bands, chosenBand, unread, openReports, children }: ShellProps) {
  const t = useTranslations("nav");
  const pathname = usePathname() ?? "/";
  // Signed out, this device forgets the sets downloaded to read offline (T-902), so nobody else
  // using it reads someone's notes.
  useEffect(() => {
    if (!account) void forgetSets();
  }, [account]);
  if (shellHidden(pathname, Boolean(account))) return <>{children}</>;

  const personal = bands.find((band) => band.personal) ?? null;
  const band = currentBand(bands, chosenBand);
  const current = currentItem(pathname, personal?.id ?? null);
  const version = versionOf(pathname);
  const item = (
    id: NavItem,
    label: string,
    href: string,
    icon: typeof BellIcon,
    selectedIcon: typeof BellIcon,
    endContent?: ReactNode,
  ) => (
    <SideNavItem
      label={label}
      href={href}
      as={Link}
      // Large rows: at least 44 px to tap with confidence on an iPad (Design Handoff 2.0, 1.5).
      size="lg"
      icon={icon}
      selectedIcon={selectedIcon}
      isSelected={current === id}
      {...(endContent ? { endContent } : {})}
    />
  );

  const heading = (
    <SideNavHeading
      heading="ChartDown"
      icon={<ChartDownLogo variant="symbol" size={28} />}
      headingHref="/"
      {...(band ? { subheading: band.personal ? t("personal") : band.name } : {})}
      {...(account
        ? {
            menu: (
              <VStack gap={1}>
                {bands.map((option) => (
                  <Item
                    key={option.id}
                    href={`/bands/choose/${option.id}`}
                    label={option.personal ? t("personal") : option.name}
                    startContent={
                      <Avatar
                        name={option.personal ? t("personal") : option.name}
                        size="sm"
                        shape="rounded"
                        tooltip={false}
                      />
                    }
                    {...(option.id === band?.id
                      ? { endContent: <Icon icon={CheckIcon} size="sm" /> }
                      : {})}
                  />
                ))}
                <Button label={t("allBands")} variant="ghost" size="sm" href="/bands" as={Link} />
              </VStack>
            ),
          }
        : {})}
    />
  );

  const nav = account ? (
    <SideNav
      header={heading}
      footer={<Footer account={account} />}
      collapsible={{ hasButton: false }}
      footerIcons={<SideNavCollapseButton size="lg" />}
    >
      <SideNavSection title={t("home")} isHeaderHidden>
        {item(
          "notices",
          t("notices"),
          "/notices",
          BellIcon,
          BellSolid,
          unread > 0 ? (
            <Badge variant="error" label={unread > 99 ? "99+" : String(unread)} />
          ) : undefined,
        )}
      </SideNavSection>
      <SideNavSection title={t("play")}>
        {item("sets", t("sets"), "/sets", QueueListIcon, QueueListSolid)}
        {item("stand", t("stand"), "/stand", ArrowsPointingOutIcon, ArrowsPointingOutSolid)}
      </SideNavSection>
      <SideNavSection title={t("create")}>
        {item("catalog", t("catalog"), "/catalog", BookOpenIcon, BookOpenSolid)}
        {item("newVersion", t("newVersion"), "/versions/new", MusicalNoteIcon, MusicalNoteSolid)}
        {item(
          "editor",
          t("editor"),
          version ? `/versions/${version}/edit` : "/versions/mine",
          PencilSquareIcon,
          PencilSolid,
        )}
        {item(
          "notes",
          t("notes"),
          version ? `/versions/${version}/notes` : "/versions/mine",
          ChatBubbleLeftRightIcon,
          ChatSolid,
        )}
      </SideNavSection>
      <SideNavSection title={t("people")}>
        {item("bands", t("bands"), "/bands", UserGroupIcon, UserGroupSolid)}
        {personal &&
          item("personal", t("personal"), `/bands/${personal.id}/sets`, UserIcon, UserSolid)}
      </SideNavSection>
      {account.admin && (
        <SideNavSection title={t("admin")}>
          {item("overview", t("overview"), "/admin", Squares2X2Icon, GridSolid)}
          {item(
            "instruments",
            t("instruments"),
            "/admin/instruments",
            MusicalNoteIcon,
            MusicalNoteSolid,
          )}
          {item("invites", t("invites"), "/admin/invites", KeyIcon, KeySolid)}
          {item(
            "reports",
            t("reports"),
            "/admin/reports",
            FlagIcon,
            FlagSolid,
            openReports > 0 ? <Badge variant="warning" label={String(openReports)} /> : undefined,
          )}
        </SideNavSection>
      )}
    </SideNav>
  ) : (
    <SideNav
      header={heading}
      footer={<Footer account={null} />}
      collapsible={{ hasButton: false }}
      footerIcons={<SideNavCollapseButton size="lg" />}
    >
      <SideNavSection title={t("create")} isHeaderHidden>
        {item("catalog", t("catalog"), "/catalog", BookOpenIcon, BookOpenSolid)}
      </SideNavSection>
    </SideNav>
  );

  return (
    <AppShell sideNav={nav} contentPadding={0}>
      {children}
    </AppShell>
  );
}

/** The side navigation's footer: the language, and the person with Sign out (or Sign in). */
function Footer({ account }: { account: ShellProps["account"] }) {
  const t = useTranslations("nav");
  const language = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const chooseLanguage = (value: string) =>
    startTransition(async () => {
      const form = new FormData();
      form.set("locale", value);
      await setLocale(form);
      router.refresh();
    });

  return (
    <VStack gap={2}>
      <SegmentedControl
        label={t("language")}
        value={locale}
        onChange={chooseLanguage}
        size="lg"
        layout="fill"
      >
        {LOCALES.map((option) => (
          <SegmentedControlItem key={option} value={option} label={language(option)} />
        ))}
      </SegmentedControl>
      {account ? (
        <HStack gap={1} vAlign="center">
          <Item
            href="/profile"
            label={account.name}
            description={[
              account.admin ? t("roleAdmin") : t("roleMember"),
              account.instruments.length > 0 ? account.instruments.join(", ") : t("noInstruments"),
            ].join(" · ")}
            startContent={<Avatar name={account.name} size="sm" tooltip={false} />}
          />
          <form action={signOut}>
            <Button
              type="submit"
              label={t("signOut")}
              isIconOnly
              variant="ghost"
              size="lg"
              tooltip={t("signOut")}
              icon={<Icon icon={ArrowRightStartOnRectangleIcon} />}
            />
          </form>
        </HStack>
      ) : (
        <Button
          label={t("signIn")}
          variant="primary"
          size="lg"
          href="/auth/sign-in"
          as={Link}
          width="100%"
        />
      )}
    </VStack>
  );
}
