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
import { BeatsControl } from "../../_components/BeatsControl";
import { ChartPreview } from "../../_components/ChartPreview";
import { forkVersion } from "./actions";
import { displayHref, keysInMode, type Display } from "./display";
import type { BasedOn } from "./load";
import { AddToSet, DisplayControls, ReportForm, VersionMenu } from "./VersionControls";

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
  setFailed?: boolean;
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
}

/** How a set reads in the "Add to a set" choice: its band, or the person's own sets, and its name. */
export function setChoiceLabel(choice: SetChoice, mySets: string): string {
  return `${choice.band ?? mySets} · ${choice.name}`;
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
  setFailed = false,
  display,
  path,
  notice,
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
  const shownKey = display?.key ?? chart.key;
  const written = keyName(chart.key);
  const canFork = signedIn && !owner && visibility === "public" && reading;
  const canReport = canFork && status !== "hidden";
  const state =
    status === "hidden"
      ? t("hidden")
      : visibility === "private"
        ? t("private")
        : status !== "active"
          ? t("frozen")
          : null;

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={1040}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={3}>
            {notice}
            <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Text type="supporting">
                  {[artists.join(", "), ...facts].filter(Boolean).join(" · ")}
                </Text>
                <Heading level={1}>{title}</Heading>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  {state && <Token label={state} size="sm" />}
                  <Token label={`${c("key")} ${keyName(shownKey)}`} size="sm" />
                  {keyName(shownKey) !== written && (
                    <Text type="supporting">{c("writtenIn", { key: written })}</Text>
                  )}
                  <Token label={`${c("time")} ${chart.header.meter ?? "4/4"}`} size="sm" />
                  {chart.header.tempo && (
                    <Token label={`${c("tempo")} ${chart.header.tempo}`} size="sm" />
                  )}
                </HStack>
                <Text color="secondary">
                  {t("by", { author })}
                  {source.youtube && (
                    <>
                      {" · "}
                      <a href={source.youtube} target="_blank" rel="noopener noreferrer">
                        {t("youtube")}
                      </a>
                    </>
                  )}
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
              <VStack gap={2} hAlign="end">
                <HStack gap={2} vAlign="center" wrap="wrap">
                  {reading && display && (
                    <Button
                      label={t("stand")}
                      variant="primary"
                      href={`/versions/${id}/stand${displayHref("", display, chart)}`}
                      icon={<StandIcon />}
                    />
                  )}
                  {owner && status === "active" && (
                    <Button label={t("edit")} href={`/versions/${id}/edit`} icon={<EditIcon />} />
                  )}
                  {owner && <Button label={t("history")} href={`/versions/${id}/history`} />}
                  {owner && visibility === "public" && status === "active" && (
                    <Button label={t("makePrivate")} href={`/versions/${id}/make-private`} />
                  )}
                  {signedIn && reading && (
                    <Button label={t("myNotes")} href={`/versions/${id}/notes`} />
                  )}
                  {canFork && (
                    <form action={forkVersion}>
                      <input type="hidden" name="versionId" value={id} />
                      <Button type="submit" label={t("fork")} icon={<ForkIcon />} />
                    </form>
                  )}
                  {!signedIn && (
                    <Button
                      label={t("fork")}
                      href={`/auth/sign-in?next=${encodeURIComponent(`/versions/${id}`)}`}
                      icon={<ForkIcon />}
                    />
                  )}
                  {canReport && (
                    <VersionMenu
                      label={t("more")}
                      report={t("report.open")}
                      reportHref={`/versions/${id}?report=open#report`}
                    />
                  )}
                </HStack>
                {canFork && <Text type="supporting">{t("forkCc0")}</Text>}
                {!signedIn && <Text type="supporting">{t("forkHint")}</Text>}
              </VStack>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        // The app's own area scrolls the chart, so the song form can stay pinned at its top.
        <LayoutContent isScrollable={false}>
          <VStack gap={5}>
            {forkFailed && <Banner status="error" title={t("forkFailed")} />}
            {setFailed && <Banner status="error" title={s("addFailed")} />}
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
            {(display || (setChoices.length > 0 && reading)) && (
              <HStack gap={4} vAlign="end" hAlign="between" wrap="wrap">
                {display && path ? (
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <DisplayControls
                      style={display.style}
                      styles={{
                        numbers: displayHref(path, { ...display, style: "numbers" }, chart),
                        letters: displayHref(path, { ...display, style: "letters" }, chart),
                      }}
                      shown={keyName(shownKey)}
                      keys={keysInMode(chart.key.minor).map((key) => ({
                        value: keyName(key),
                        label:
                          keyName(key) === written
                            ? v("writtenOption", { key: keyName(key) })
                            : keyName(key),
                        href: displayHref(path, { ...display, key }, chart),
                      }))}
                      words={{
                        label: v("label"),
                        style: v("style"),
                        numbers: v("numbers"),
                        letters: v("letters"),
                        key: v("key"),
                      }}
                    />
                    {display && (
                      <BeatsControl
                        value={display.beats}
                        hrefs={{
                          off: displayHref(path, { ...display, beats: "off" }, chart),
                          auto: displayHref(path, { ...display, beats: "auto" }, chart),
                          always: displayHref(path, { ...display, beats: "always" }, chart),
                        }}
                        words={{
                          label: c("beatsLabel"),
                          name: c("beatsName"),
                          off: c("beatsOff"),
                          auto: c("beatsAuto"),
                          always: c("beatsAlways"),
                        }}
                      />
                    )}
                    {keyName(shownKey) !== written && (
                      <Button
                        label={v("written", { key: written })}
                        variant="ghost"
                        href={displayHref(path, { ...display, key: chart.key }, chart)}
                      />
                    )}
                  </HStack>
                ) : (
                  <span />
                )}
                {setChoices.length > 0 && reading && (
                  <AddToSet
                    versionId={id}
                    choices={setChoices.map((choice) => ({
                      value: choice.id,
                      label: setChoiceLabel(choice, s("mySets")),
                    }))}
                    words={{
                      label: s("addTo"),
                      placeholder: s("chooseSet"),
                      submit: s("addButton"),
                    }}
                  />
                )}
              </HStack>
            )}
            <ChartPreview
              chart={chart}
              style={display?.style ?? "numbers"}
              homeKey={shownKey}
              isFramed
              hasForm
              beats={display?.beats ?? "auto"}
            />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
