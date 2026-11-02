import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StatusDot } from "@astryxdesign/core/StatusDot";
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
import { hasInstrumentIcon, Icon } from "@chartdown/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { localTimeZone } from "../../lib/sets/today";
import { setWhen, todayIn } from "../../lib/sets/when";
import { ActionRow } from "../_components/ActionRow";
import { Banner } from "../_components/Banner";
import {
  AddIcon,
  GoIcon,
  GuideIcon,
  InviteIcon,
  NoteIcon,
  ReportIcon,
  RevisionIcon,
  StandIcon,
  VersionIcon,
} from "../_components/ActionIcons";
import { LinkChoice } from "../_components/LinkChoice";
import { noticeTexts } from "../notices/text";
import { Greeting, OfflineDot } from "./HomeClient";
import type { HomeData, UsagePeriod } from "./load";
import { PageLayout } from "../_components/PageLayout";
import { guessPhone } from "../../lib/shell/guessPhone";

const GUIDE = "https://github.com/ChartDown/spec";

/**
 * Home, the first screen after sign-in (T-1308; Design Handoff 2.0 screen 00): what's next, what
 * needs the person, and how their work is doing. Music director, musician or new user, as the
 * data says; the usage of their public versions is totals only (R-02.11).
 */
export async function HomeView({
  data,
  usage,
  messages,
}: {
  data: HomeData;
  usage: UsagePeriod;
  /** Shown first, such as the person's band invitations. */
  messages?: ReactNode;
}) {
  const t = await getTranslations("home");
  const s = await getTranslations("sets");
  const sources = await getTranslations("version.source");
  const o = await getTranslations("offline");
  const format = await getFormatter();
  const now = new Date();
  const zone = await localTimeZone();
  const today = todayIn(zone, now);
  const first = data.name.trim().split(/\s+/)[0] ?? "";
  const isNew = data.variant === "new";
  const isMd = data.variant === "md";
  const plays = data.instruments.map((instrument) => instrument.name).join(", ");
  const bandName = data.band?.personal ? t("personal") : (data.band?.name ?? "");
  const subtitle = isNew
    ? t("newSubtitle")
    : !data.band || data.band.personal
      ? t("personalSubtitle")
      : isMd
        ? [t("mdOf", { band: bandName }), plays].filter(Boolean).join(" · ")
        : plays
          ? t("playsIn", { instruments: plays, band: bandName })
          : t("musicianIn", { band: bandName });
  // Create set: the current band's sets when the person directs it, otherwise their own.
  const setsHref =
    isMd && data.band
      ? `/bands/${data.band.id}/sets`
      : data.personalId
        ? `/bands/${data.personalId}/sets`
        : "/sets";
  const relativeDay = (date: string | null) =>
    date
      ? format.relativeTime(new Date(`${date}T00:00:00Z`), {
          now: new Date(`${today}T00:00:00Z`),
          unit: "day",
        })
      : t("undated");
  const recent = await noticeTexts(data.recent);
  const attention = data.attention;
  const attentionItems = [
    attention.newer && {
      key: "newer",
      icon: <RevisionIcon />,
      label: t("attention.newer", { count: attention.newer.songs }),
      description: t("attention.newerHint", { set: attention.newer.set }),
      href: `/sets/${attention.newer.setId}/edit`,
    },
    attention.pending && {
      key: "pending",
      icon: <InviteIcon />,
      label: t("attention.pending", { count: attention.pending.count }),
      description: attention.pending.band,
      href: `/bands/${attention.pending.bandId}?tab=invitations`,
    },
    attention.reports > 0 && {
      key: "reports",
      icon: <ReportIcon />,
      label: t("attention.reports", { count: attention.reports }),
      description: t("attention.admin"),
      href: "/admin/reports",
    },
    attention.notes > 0 && {
      key: "notes",
      icon: <NoteIcon />,
      label: t("attention.notes", { count: attention.notes }),
      description: t("attention.notesHint"),
      href: "/notices",
    },
    attention.keys > 0 && {
      key: "keys",
      icon: <RevisionIcon />,
      label: t("attention.keys", { count: attention.keys }),
      description: t("attention.keysHint"),
      href: "/notices",
    },
  ].filter(Boolean) as {
    key: string;
    icon: ReactNode;
    label: string;
    description: string;
    href: string;
  }[];
  // A version nobody played stays off the report, so a library of zeros does not fill the page.
  const used = data.usage.rows.filter((row) => row.bands > 0 || row.musicians > 0);
  const shown = used.slice(0, 5);
  const top = Math.max(1, ...shown.map((row) => row.musicians));
  const played = used.length > 0;
  const steps = [
    { done: data.steps.instruments, key: "instruments", href: "/profile" },
    { done: data.steps.band, key: "band", href: "/bands" },
    { done: data.steps.version, key: "version", href: "/versions/new" },
    { done: data.steps.set, key: "set", href: setsHref },
  ] as const;

  const header = (
    <LayoutHeader hasDivider>
      <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
        <VStack gap={1}>
          <Text type="supporting">
            {format.dateTime(now, { dateStyle: "full", timeZone: zone })}
          </Text>
          <Heading level={1}>
            {isNew ? (
              t("welcome", { name: first })
            ) : (
              <Greeting
                words={{
                  hello: t("hello", { name: first }),
                  morning: t("morning", { name: first }),
                  afternoon: t("afternoon", { name: first }),
                  evening: t("evening", { name: first }),
                }}
              />
            )}
          </Heading>
          <Text color="secondary">{subtitle}</Text>
        </VStack>
        {!isNew && (
          <HStack gap={2}>
            {data.next && <Button label={t("createSet")} href={setsHref} icon={<AddIcon />} />}
            <Button label={t("newVersion")} href="/versions/new" icon={<VersionIcon />} />
          </HStack>
        )}
      </HStack>
    </LayoutHeader>
  );

  const nextUp = data.next ? (
    <Card>
      <section aria-labelledby="next-up">
        <VStack gap={3}>
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <Text type="supporting">
              {t("nextUp")} · {relativeDay(data.next.date)}
            </Text>
            <OfflineDot setId={data.next.id} label={o("downloaded")} />
          </HStack>
          <Heading level={2} id="next-up">
            {data.next.name} – {s(`types.${data.next.type}`)}
          </Heading>
          <Text color="secondary">
            {[
              data.next.band,
              setWhen(format, data.next.date, data.next.time, "full") ?? s("noDate"),
              s("songs", { count: data.next.songs.length }),
              data.next.plays.length > 0 &&
                t("youPlay", { instruments: data.next.plays.join(", ") }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <HStack gap={2} vAlign="center" wrap="wrap">
            {data.next.notesForYou > 0 && (
              <Token
                label={t("notesForYou", { count: data.next.notesForYou })}
                color="red"
                size="sm"
              />
            )}
            {data.next.songs.slice(0, 2).map((song, index) => (
              <Token
                key={index}
                label={t("songIn", { title: song.title, key: song.key })}
                size="sm"
              />
            ))}
            {data.next.songs.length > 2 && (
              <Text type="supporting">{t("more", { count: data.next.songs.length - 2 })}</Text>
            )}
          </HStack>
          <HStack gap={2} wrap="wrap">
            {data.next.songs.length > 0 && (
              <Button
                label={s("startStand")}
                variant="primary"
                href={`/sets/${data.next.id}/songs/1/stand`}
                icon={<StandIcon />}
              />
            )}
            <Button label={t("openSet")} href={`/sets/${data.next.id}`} />
          </HStack>
        </VStack>
      </section>
    </Card>
  ) : (
    <EmptyState
      title={t("noUpcoming")}
      description={isNew ? t("noUpcomingNew") : t("noUpcomingHint")}
      {...(!isNew
        ? {
            actions: (
              <HStack gap={2} wrap="wrap" hAlign="center">
                <Button
                  label={t("createSet")}
                  variant="primary"
                  href={setsHref}
                  icon={<AddIcon />}
                />
                <Button label={t("seeAllSets")} href="/sets" />
              </HStack>
            ),
          }
        : {})}
    />
  );

  const stat = (label: string, value: number, hint: string, href: string) => (
    <ClickableCard label={hint ? `${label}: ${value}. ${hint}` : `${label}: ${value}`} href={href}>
      <VStack gap={1}>
        <Text type="supporting">{label}</Text>
        <Text size="3xl" weight="bold">
          {value}
        </Text>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting">{hint}</Text>
          <GoIcon />
        </HStack>
      </VStack>
    </ClickableCard>
  );

  const content = (
    <>
      <VStack gap={5}>
        {messages}
        {isNew && (
          <Card>
            <section aria-labelledby="get-started">
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                  <Heading level={2} id="get-started">
                    {t("getStarted")}
                  </Heading>
                  <Text type="supporting">
                    {t("done", { count: steps.filter((step) => step.done).length })}
                  </Text>
                </HStack>
                <List hasDividers edge="outset">
                  {steps.map((step, index) => (
                    // A step to do is a tap target whole, following its button (T-3035).
                    <ActionRow
                      key={step.key}
                      isLink={!step.done}
                      startContent={<Text weight="semibold">{index + 1}</Text>}
                      label={t(`steps.${step.key}.title`)}
                      description={t(`steps.${step.key}.hint`)}
                      actions={
                        step.done ? (
                          <Token label={t("stepDone")} size="sm" />
                        ) : (
                          <Button label={t(`steps.${step.key}.action`)} href={step.href} />
                        )
                      }
                    />
                  ))}
                </List>
              </VStack>
            </section>
          </Card>
        )}
        {nextUp}
        {!isNew && (
          <Grid columns={{ minWidth: 160 }} gap={3}>
            {stat(
              t("stats.bands"),
              data.bands,
              data.bands > 1 ? t("stats.withPersonal") : bandName,
              "/bands",
            )}
            {stat(
              t("stats.upcoming"),
              data.upcoming,
              data.next ? t("stats.next", { when: relativeDay(data.next.date) }) : t("stats.none"),
              "/sets",
            )}
            {stat(
              t("stats.versions"),
              data.versions.public + data.versions.private,
              data.versions.public + data.versions.private > 0
                ? t("stats.publicPrivate", {
                    public: data.versions.public,
                    private: data.versions.private,
                  })
                : t("stats.noneYet"),
              "/versions/mine",
            )}
            {stat(
              t("stats.musicians"),
              data.members.length,
              t("stats.inBand"),
              data.band && !data.band.personal ? `/bands/${data.band.id}` : "/bands",
            )}
          </Grid>
        )}
        {!isNew &&
          (data.versions.public > 0 ? (
            <section aria-labelledby="usage">
              <VStack gap={3}>
                <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                  <VStack gap={0.5}>
                    <Heading level={2} id="usage">
                      {t("usage.title")}
                    </Heading>
                    <Text type="supporting">
                      {played && data.usage.total
                        ? t("usage.summary", {
                            musicians: data.usage.total.musicians,
                            bands: data.usage.total.bands,
                            period: t(`usage.${usage ?? "all"}`),
                          })
                        : t("usage.noneYet")}
                    </Text>
                  </VStack>
                  {played && (
                    <LinkChoice
                      label={t("usage.period")}
                      current={String(usage ?? "all")}
                      options={(["7", "30", "all"] as const).map((value) => ({
                        value,
                        label: t(`usage.choice.${value}`),
                        href: value === "30" ? "/" : `/?usage=${value}`,
                      }))}
                    />
                  )}
                </HStack>
                {played && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>{t("usage.version")}</TableHeaderCell>
                        <TableHeaderCell>{t("usage.bands")}</TableHeaderCell>
                        <TableHeaderCell>{t("usage.musicians")}</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <VStack gap={0.5}>
                              <Link href={`/versions/${row.id}`}>
                                <Text weight="semibold">{row.title}</Text>
                              </Link>
                              <Text type="supporting">
                                {[sources(row.sourceType as "live"), row.year]
                                  .filter(Boolean)
                                  .join(" ")}
                              </Text>
                            </VStack>
                          </TableCell>
                          <TableCell>{row.bands}</TableCell>
                          <TableCell>
                            <HStack gap={2} vAlign="center">
                              <Text>{row.musicians}</Text>
                              <ProgressBar
                                label={t("usage.relative", { title: row.title })}
                                isLabelHidden
                                value={row.musicians}
                                max={top}
                                variant="neutral"
                              />
                            </HStack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                  <Text type="supporting">{t("usage.privacy")}</Text>
                  {data.usage.rows.length > shown.length && (
                    <Button label={t("usage.editor")} variant="ghost" href="/versions/mine" />
                  )}
                </HStack>
              </VStack>
            </section>
          ) : (
            <Card>
              <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                <VStack gap={0.5}>
                  <Heading level={2}>{t("share.title")}</Heading>
                  <Text color="secondary">{t("share.hint")}</Text>
                </VStack>
                <Button label={t("share.action")} href="/versions/new" icon={<VersionIcon />} />
              </HStack>
            </Card>
          ))}
        {recent.length > 0 && (
          <section aria-labelledby="recent">
            <VStack gap={2}>
              <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                <Heading level={2} id="recent">
                  {t("recent")}
                </Heading>
                <Button label={t("allNotices")} variant="ghost" href="/notices" />
              </HStack>
              <List hasDividers edge="outset">
                {recent.map((notice) => (
                  <ListItem
                    key={notice.id}
                    href={`/notices/${notice.id}`}
                    startContent={
                      <StatusDot
                        variant={notice.read_at ? "neutral" : "accent"}
                        label={notice.read_at ? t("read") : t("unread")}
                      />
                    }
                    label={notice.text}
                    endContent={
                      <Text type="supporting">
                        {format.relativeTime(new Date(notice.created_at), now)}
                      </Text>
                    }
                  />
                ))}
              </List>
            </VStack>
          </section>
        )}
      </VStack>
    </>
  );

  const panel = isNew ? (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={2}>{t("help.joinTitle")}</Heading>
        <Text color="secondary">{t("help.join")}</Text>
      </VStack>
      <VStack gap={2}>
        <Heading level={2}>{t("help.guideTitle")}</Heading>
        <Text color="secondary">{t("help.guide")}</Text>
        <HStack>
          <Button label={t("help.openGuide")} href={GUIDE} icon={<GuideIcon />} />
        </HStack>
      </VStack>
    </VStack>
  ) : (
    <VStack gap={6}>
      {attentionItems.length > 0 && (
        <section aria-labelledby="attention">
          <VStack gap={2}>
            <Heading level={2} id="attention">
              {t("attention.title")}
            </Heading>
            <List hasDividers edge="outset">
              {attentionItems.map((item) => (
                <ListItem
                  key={item.key}
                  href={item.href}
                  startContent={item.icon}
                  label={item.label}
                  description={item.description}
                />
              ))}
            </List>
          </VStack>
        </section>
      )}
      {data.band && !data.band.personal && data.members.length > 0 && (
        <section aria-labelledby="your-band">
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
              <Heading level={2} id="your-band">
                {t("yourBand")}
              </Heading>
              {isMd && (
                <Button label={t("manage")} variant="ghost" href={`/bands/${data.band.id}`} />
              )}
            </HStack>
            <Text type="supporting">
              {t("bandLine", { band: data.band.name, count: data.members.length })}
            </Text>
            <List hasDividers edge="outset">
              {data.members.map((member, index) => (
                <ListItem
                  key={index}
                  startContent={<Avatar name={member.name} size="sm" tooltip={false} />}
                  label={member.you ? t("you", { name: member.name }) : member.name}
                  description={[member.md && t("md"), member.instruments.join(", ")]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))}
            </List>
          </VStack>
        </section>
      )}
      <section aria-labelledby="your-instruments">
        <VStack gap={2}>
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <Heading level={2} id="your-instruments">
              {t("yourInstruments")}
            </Heading>
            <Button
              label={t("edit")}
              href="/profile"
              variant={data.instruments.length > 0 ? "ghost" : "secondary"}
            />
          </HStack>
          {data.instruments.length > 0 ? (
            <>
              <HStack gap={2} wrap="wrap">
                {data.instruments.map((instrument) => (
                  <Token
                    key={instrument.slug}
                    label={instrument.name}
                    color="purple"
                    size="sm"
                    {...(hasInstrumentIcon(instrument.slug)
                      ? { icon: <Icon name={instrument.slug} size={16} /> }
                      : {})}
                  />
                ))}
              </HStack>
              <Text type="supporting">{t("instrumentsHint")}</Text>
            </>
          ) : (
            <Banner
              status="warning"
              title={t("noInstrumentTitle")}
              description={t("noInstrumentHint")}
            />
          )}
        </VStack>
      </section>
    </VStack>
  );

  const phone = await guessPhone();
  return (
    <PageLayout
      phone={phone}
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={header}
      panel={{
        side: "end",
        width: 340,
        label: isNew ? t("help.label") : t("forYou"),
        children: panel,
      }}
      content={content}
    />
  );
}
