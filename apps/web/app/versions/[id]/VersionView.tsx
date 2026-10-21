import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { keyName, type Chart } from "chartdown";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { EditIcon, ForkIcon, StandIcon } from "../../_components/ActionIcons";
import { forkVersion, saveVideoStart } from "./actions";
import type { Display } from "./display";
import { BackToCatalog } from "./BackToCatalog";
import { BandAudio, type BandRecording } from "./BandAudio";
import { VideoLink } from "../../_components/VideoDock";
import { ViewOptions } from "../../_components/ViewOptions";
import type { BasedOn } from "./load";
import { AddToSet, ReportForm, VersionMenu, type VersionMenuItem } from "./VersionControls";
import { DisplayBar, DisplayedChart, ShownKey, StandLink, VersionDisplay } from "./VersionDisplay";

export interface VersionSource {
  type: "studio" | "live" | "acoustic" | "own_arrangement";
  album: string | null;
  year: number | null;
  youtube: string | null;
}

/** A set this person may add the version to; band null means their personal space. */
export interface SetChoice {
  id: string;
  band: string | null;
  name: string;
}

export interface VersionViewProps {
  id: string;
  title: string;
  artists: string[];
  author: string;
  source: VersionSource;
  chart: Chart;
  signedIn: boolean;
  /** The signed-in person owns this version: they find its history (R-02.8). */
  owner?: boolean;
  /** For a fork, the version it is based on (R-02.7). */
  basedOn?: BasedOn | null;
  /** A private version, or a public one frozen when its owner made it private (R-02.4). */
  visibility?: "public" | "private";
  status?: "active" | "frozen" | "hidden";
  /** The sets of the bands where this person is the MD (R-05.2). */
  setChoices?: SetChoice[];
  /** The bands where this person is the MD, to start a new set in; null names their own. */
  setBands?: { id: string; name: string | null }[];
  /** The last fork attempt failed. */
  forkFailed?: boolean;
  /** How the person's report went (R-07.2). */
  report?: "open" | "sent" | "already" | "failed" | null;
  /** Numbers or letters and the key to show (R-03.2); numbers in the written key by default. */
  display?: Display;
  /** The page's own address, for the display choices. */
  path?: string;
  /** Shown above the chart, e.g. when reading an earlier revision. */
  notice?: ReactNode;
  /** A message on the current version, such as a save just made; it changes nothing else. */
  message?: ReactNode;
  /** The server's guess that this is a phone: a 16 px gutter and the song form as a strip (R-03.8). */
  phone?: boolean;
  /** The song, for the way back to the catalog when the person came from there (R-02.10). */
  songId?: string;
  /** Where the music starts in the video, in seconds, as the owner saved it (R-03.11). */
  videoStart?: number | null;
  /** The bands' recordings of this version, and the bands this person adds one for (R-06.7). */
  audio?: { recordings: BandRecording[]; bands: { id: string; name: string }[] };
}

/** How a set reads in the "Add to a set" choice: its band, or the person's own sets, and its name. */
export function setChoiceLabel(choice: SetChoice, mySets: string): string {
  return `${choice.band ?? mySets} · ${choice.name}`;
}

/**
 * The version's "…" menu (T-2806): a new version of the song for anyone signed in, adding the
 * band's audio for a band's MD, Make private for the owner of an active public version (R-02.4),
 * and the report form for everyone else (R-07.2). Who sees what is unchanged (R-02.6).
 */
export function versionMenuItems({
  id,
  songId,
  newOfSong,
  addAudio,
  makePrivate,
  report,
}: {
  id: string;
  songId?: string | undefined;
  /** Each label is given when the person is offered that entry. */
  newOfSong?: string | false;
  addAudio?: string | false;
  makePrivate?: string | false;
  report?: string | false;
}): VersionMenuItem[] {
  const first: VersionMenuItem[] = [
    ...(newOfSong && songId
      ? [{ label: newOfSong, href: `/versions/new?song=${songId}&from=${id}` }]
      : []),
    ...(addAudio ? [{ label: addAudio, opens: "bandAudio" as const }] : []),
  ];
  const last: VersionMenuItem[] = [
    ...(makePrivate ? [{ label: makePrivate, href: `/versions/${id}/make-private` }] : []),
    ...(report ? [{ label: report, href: `/versions/${id}?report=open#report` }] : []),
  ];
  return first.length > 0 && last.length > 0
    ? [...first, { type: "divider" }, ...last]
    : [...first, ...last];
}

/**
 * A version as everyone reads it (Design Handoff 2.0, the screens table: Version): its chart in
 * the written key, with no band's layer (R-06.5). The header names the song, its source, key and
 * meter; Stand mode leads the actions, then what this person may do with it.
 */
export function VersionView({
  id,
  title,
  artists,
  author,
  source,
  chart,
  signedIn,
  owner = false,
  basedOn = null,
  visibility = "public",
  status = "active",
  forkFailed = false,
  report = null,
  setChoices = [],
  setBands = [],
  display,
  path,
  notice,
  message,
  phone = false,
  songId,
  videoStart = null,
  audio,
}: VersionViewProps) {
  const t = useTranslations("version");
  const s = useTranslations("sets");
  const c = useTranslations("chart");
  const v = useTranslations("viewer");
  const facts = [
    t(`source.${source.type}`),
    source.album && t("album", { album: source.album }),
    source.year && String(source.year),
  ].filter(Boolean);
  const reading = notice === undefined;
  const written = keyName(chart.key);
  const canFork = signedIn && !owner && visibility === "public" && reading;
  const canReport = canFork && status !== "hidden";
  const canAddToSet = setChoices.length > 0 || setBands.length > 0;
  const a = useTranslations("audio");
  // The header's actions: the large touch size, the medium one on a phone (T-2811).
  const size = phone ? "md" : "lg";
  // A new version of the song starts from this chart (R-02.1, T-2405).
  const menu = versionMenuItems({
    id,
    songId,
    newOfSong: signedIn && reading && t("newOfSong"),
    addAudio: reading && (audio?.bands.length ?? 0) > 0 && a("add"),
    makePrivate: owner && visibility === "public" && status === "active" && t("makePrivate"),
    report: canReport && t("report.open"),
  });
  const state =
    status === "hidden"
      ? t("hidden")
      : visibility === "private"
        ? t("private")
        : status !== "active"
          ? t("frozen")
          : null;

  return (
    <VersionDisplay chart={chart} initial={display} path={path}>
      <Layout
        height="auto"
        // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6), 16 px on a
        // phone (design handoff 5).
        padding={phone ? 4 : 8}
        contentWidth={1040}
        header={
          <LayoutHeader hasDivider>
            <VStack gap={3}>
              {notice}
              {message}
              {/* One start edge: the way back, the song, its tokens and its media (T-2806). */}
              {songId && (
                <HStack>
                  <BackToCatalog song={songId} label={t("backToCatalog")} />
                </HStack>
              )}
              <VStack gap={4}>
                <VStack gap={1}>
                  <Text type="supporting">
                    {[artists.join(", "), ...facts].filter(Boolean).join(" · ")}
                  </Text>
                  <Heading level={1}>{title}</Heading>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    {state && <Token label={state} size="sm" />}
                    <ShownKey
                      words={{ key: c("key"), writtenIn: c("writtenIn", { key: written }) }}
                    />
                    <Token label={`${c("time")} ${chart.header.meter ?? "4/4"}`} size="sm" />
                    {chart.header.tempo && (
                      <Token label={`${c("tempo")} ${chart.header.tempo}`} size="sm" />
                    )}
                  </HStack>
                  <Text color="secondary">
                    {t("by", { author })}
                    {basedOn && (
                      <>
                        {" · "}
                        {basedOn === "unknown" ? (
                          t("basedOnUnknown")
                        ) : (
                          <Link href={`/versions/${basedOn.id}`}>
                            {t("basedOn", { author: basedOn.author })}
                          </Link>
                        )}
                      </>
                    )}
                  </Text>
                </VStack>
                {/* The actions under the title, on its start edge, wrapping: on every size as on a
                    phone (owner's review, October 21, 2026). */}
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    {reading && (
                      <StandLink
                        base={`/versions/${id}/stand`}
                        label={t("stand")}
                        icon={<StandIcon />}
                        size={size}
                      />
                    )}
                    {signedIn && reading && (
                      <Button label={t("myNotes")} href={`/versions/${id}/notes`} size={size} />
                    )}
                    {owner && status === "active" && (
                      <Button
                        label={t("edit")}
                        href={`/versions/${id}/edit`}
                        icon={<EditIcon />}
                        size={size}
                      />
                    )}
                    {owner && (
                      <Button label={t("history")} href={`/versions/${id}/history`} size={size} />
                    )}
                    {canFork && (
                      <form action={forkVersion}>
                        <input type="hidden" name="versionId" value={id} />
                        <Button type="submit" label={t("fork")} icon={<ForkIcon />} size={size} />
                      </form>
                    )}
                    {!signedIn && (
                      <Button
                        label={t("fork")}
                        href={`/auth/sign-in?next=${encodeURIComponent(`/versions/${id}`)}`}
                        icon={<ForkIcon />}
                        size={size}
                      />
                    )}
                    {canAddToSet && reading && (
                      <AddToSet
                        size={size}
                        versionId={id}
                        choices={setChoices.map((choice) => ({
                          value: choice.id,
                          label: setChoiceLabel(choice, s("mySets")),
                          name: choice.name,
                        }))}
                        newSets={setBands.map((band) => ({
                          label:
                            setBands.length === 1
                              ? s("newSet")
                              : s("newSetIn", { band: band.name ?? s("mySets") }),
                          href: `/bands/${band.id}/sets`,
                        }))}
                      />
                    )}
                    {menu.length > 0 && <VersionMenu label={t("more")} items={menu} size={size} />}
                  </HStack>
                  {canFork && <Text type="supporting">{t("forkCc0")}</Text>}
                  {!signedIn && <Text type="supporting">{t("forkHint")}</Text>}
                </VStack>
              </VStack>
              {/* The media: the video, then the bands' recordings. */}
              {(source.youtube || (audio && reading)) && (
                <VStack gap={2}>
                  {source.youtube && (
                    <HStack>
                      <VideoLink
                        size={size}
                        url={source.youtube}
                        chart={chart}
                        saved={videoStart}
                        save={
                          owner && reading && status === "active"
                            ? saveVideoStart.bind(null, id)
                            : undefined
                        }
                      />
                    </HStack>
                  )}
                  {audio && reading && (
                    <BandAudio
                      versionId={id}
                      recordings={audio.recordings}
                      bands={audio.bands}
                      chart={chart}
                    />
                  )}
                </VStack>
              )}
            </VStack>
          </LayoutHeader>
        }
        content={
          // The app's own area scrolls the chart, so the song form can stay pinned at its top.
          <LayoutContent isScrollable={false}>
            <VStack gap={5}>
              {forkFailed && <Banner status="error" title={t("forkFailed")} />}
              {(report === "sent" || report === "already") && (
                <Banner status="success" title={t(`report.${report}`)} />
              )}
              {report === "failed" && <Banner status="error" title={t("report.failed")} />}
              {canReport && (report === "open" || report === "failed") && (
                <ReportForm
                  versionId={id}
                  words={{
                    title: t("report.title"),
                    reason: t("report.reason"),
                    lyrics: t("report.reasons.lyrics"),
                    other: t("report.reasons.other"),
                    note: t("report.note"),
                    submit: t("report.submit"),
                  }}
                />
              )}
              <DisplayedChart
                phone={phone}
                // The page's settings in one sheet beside the metronome, as in stand mode (T-2807).
                viewOptions={
                  display &&
                  path && (
                    <ViewOptions>
                      <DisplayBar
                        words={{
                          label: v("label"),
                          style: v("style"),
                          numbers: v("numbers"),
                          letters: v("letters"),
                          key: v("key"),
                          written: v("written", { key: written }),
                          beats: {
                            label: c("beatsLabel"),
                            name: c("beatsName"),
                            off: c("beatsOff"),
                            auto: c("beatsAuto"),
                            always: c("beatsAlways"),
                            help: { about: c("beatsAbout"), text: c("beatsHelp") },
                          },
                        }}
                      />
                    </ViewOptions>
                  )
                }
              />
            </VStack>
          </LayoutContent>
        }
      />
    </VersionDisplay>
  );
}
