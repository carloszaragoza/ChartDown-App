"use client";

import { keyName, parse, type Chart } from "chartdown";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  dismissRemoved,
  READER,
  removedSets,
  storedSet,
  storedSets,
  SYNCED,
  type SetBundle,
} from "../../../../lib/offline/store";
import { setSongKey } from "../../../../lib/sets/lineup";
import { songView, type SetSong } from "../../../../lib/sets/song";
import { setWhen } from "../../../../lib/sets/when";
import { ChartPreview } from "../../../_components/ChartPreview";
import { readDisplay } from "../../../versions/[id]/display";
import { readSection } from "../../../versions/[id]/stand/standHref";
import { StandMode } from "../../../versions/[id]/stand/StandMode";
import { OfflineChanges } from "../../../_components/OfflineChanges";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";

const noChanges = () => () => {};

type Place =
  | { kind: "list" }
  | { kind: "set"; setId: string }
  | { kind: "song"; setId: string; position: number; stand: boolean };

/** Where the reader is, from its address: /offline/set[/<set>[/<song>[/stand]]]. */
export function readPlace(pathname: string): Place {
  const [setId, song, stand] = pathname.slice(READER.length).split("/").filter(Boolean);
  if (!setId) return { kind: "list" };
  const position = Number(song);
  if (!Number.isInteger(position) || position < 1) return { kind: "set", setId };
  return { kind: "song", setId, position, stand: stand === "stand" };
}

/** The notes of a song as its person sees them, placed against the charts they were anchored to. */
function songNotes(song: SetSong, bundle: SetBundle) {
  const chart = parse(song.content);
  const anchored = (revisionId: string): Chart | undefined => {
    const content = bundle.anchored[revisionId];
    return content === undefined ? undefined : parse(content);
  };
  return { chart, view: songView(chart, song, anchored) };
}

/**
 * The offline reader (R-08.2, R-08.4): the downloaded sets, a set's songs, a song with the
 * person's notes, and stand mode, all from the device and read-only.
 */
export function OfflineReader() {
  const t = useTranslations("offline");
  const s = useTranslations("sets");
  const c = useTranslations("chart");
  const format = useFormatter();
  // Drawn only in the browser: the address and the stored sets are only known there.
  const pathname = useSyncExternalStore(
    noChanges,
    () => window.location.pathname,
    () => null,
  );
  const place = useMemo(() => (pathname === null ? null : readPlace(pathname)), [pathname]);
  const [bundle, setBundle] = useState<SetBundle | null | undefined>(undefined);
  const [all, setAll] = useState<SetBundle[]>([]);

  const [removed, setRemoved] = useState<{ id: string; name: string }[]>([]);

  // Loads what is kept on the device, again whenever it is brought up to date (T-903).
  useEffect(() => {
    if (!place) return;
    const load = () => {
      if (place.kind === "list") {
        void storedSets().then(setAll);
        void removedSets().then(setRemoved);
      } else void storedSet(place.setId).then(setBundle);
    };
    load();
    window.addEventListener(SYNCED, load);
    return () => window.removeEventListener(SYNCED, load);
  }, [place]);

  if (!place) return null;
  const banner = (
    <div role="note">
      <Banner status="info" title={t("readOnly")} />
    </div>
  );

  if (place.kind === "list") {
    return (
      <main>
        <Layout
          height="auto"
          // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
          padding={8}
          contentWidth={760}
          header={
            <LayoutHeader hasDivider>
              <Heading level={1}>{t("listTitle")}</Heading>
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                {banner}
                {removed.map((item) => (
                  <div key={item.id} role="status">
                    <Banner
                      status="warning"
                      title={t("removed", { name: item.name })}
                      endContent={
                        <Button
                          label={t("gotIt")}
                          size="sm"
                          onClick={() =>
                            void dismissRemoved(item.id).then(() =>
                              setRemoved((now) => now.filter((other) => other.id !== item.id)),
                            )
                          }
                        />
                      }
                    />
                  </div>
                ))}
                {all.length === 0 ? (
                  <EmptyState title={t("noneDownloaded")} />
                ) : (
                  <List hasDividers>
                    {all.map((item) => (
                      <Item
                        key={item.set.id}
                        as="li"
                        href={`${READER}/${item.set.id}`}
                        label={item.set.name}
                        description={`${item.set.personal ? s("mySets") : item.set.band} · ${
                          setWhen(format, item.set.date, item.set.time) ?? s("noDate")
                        }`}
                      />
                    ))}
                  </List>
                )}
              </VStack>
            </LayoutContent>
          }
        />
      </main>
    );
  }

  if (bundle === undefined) return null;
  if (!bundle) {
    return (
      <main>
        <EmptyState
          title={t("notDownloadedTitle")}
          description={t("notDownloaded")}
          headingLevel={1}
          actions={<Button label={t("allDownloaded")} href={READER} />}
        />
      </main>
    );
  }

  const base = `${READER}/${bundle.set.id}`;
  const total = bundle.songs.length;

  if (place.kind === "set") {
    return (
      <main>
        <Layout
          height="auto"
          // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
          padding={8}
          header={
            <LayoutHeader hasDivider>
              <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
                <VStack gap={1}>
                  <Text type="supporting">
                    {bundle.set.personal ? s("mySets") : bundle.set.band} ·{" "}
                    {s(`types.${bundle.set.type}`)}
                  </Text>
                  <Heading level={1}>{bundle.set.name}</Heading>
                  <Text color="secondary">
                    {[
                      setWhen(format, bundle.set.date, bundle.set.time, "full"),
                      s("songs", { count: total }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </VStack>
                {total > 0 && (
                  <Button label={s("startStand")} variant="primary" href={`${base}/1/stand`} />
                )}
              </HStack>
            </LayoutHeader>
          }
          end={
            <LayoutPanel width={340} hasDivider role="region" label={s("lineup")}>
              <VStack gap={3}>
                <Heading level={2}>{s("lineup")}</Heading>
                <List>
                  {bundle.lineup.map((member, index) => (
                    <Item
                      key={index}
                      as="li"
                      label={member.name}
                      description={
                        member.instruments.length > 0 ? member.instruments.join(", ") : s("sitsOut")
                      }
                      startContent={<Avatar name={member.name} tooltip={false} />}
                    />
                  ))}
                </List>
              </VStack>
            </LayoutPanel>
          }
          content={
            <LayoutContent role="region" label={s("songsTitle")}>
              <VStack gap={3}>
                {banner}
                <OfflineChanges setId={bundle.set.id} />
                <Heading level={2}>{s("songsTitle")}</Heading>
                <List listStyle="decimal">
                  {bundle.songs.map((song) => {
                    const { chart, view } = songNotes(song, bundle);
                    return (
                      <Item
                        key={song.position}
                        as="li"
                        label={<a href={`${base}/${song.position}`}>{song.title}</a>}
                        endContent={
                          <HStack gap={2} vAlign="center">
                            <Token
                              label={`${s("key")} ${keyName(setSongKey(chart, song.set_key))}`}
                              size="sm"
                            />
                            {view.forYou > 0 ? (
                              <HStack gap={1} vAlign="center">
                                <StatusDot variant="error" label={s("notesDot")} />
                                <Text type="supporting">
                                  {song.role === "musician"
                                    ? s("forYouCount", { count: view.forYou })
                                    : s("notesCount", { count: view.forYou })}
                                </Text>
                              </HStack>
                            ) : (
                              <Text type="supporting">{s("noNotes")}</Text>
                            )}
                          </HStack>
                        }
                      />
                    );
                  })}
                </List>
              </VStack>
            </LayoutContent>
          }
        />
      </main>
    );
  }

  const song = bundle.songs.find((item) => item.position === place.position);
  if (!song) return null;
  const { chart, view } = songNotes(song, bundle);
  const homeKey = setSongKey(chart, song.set_key);
  const notes = view.sections.map((section) =>
    section.map((note) => ({
      md: note.md,
      roles: note.roles,
      passes: note.passes,
      text: note.bar ? `${s("bar", { bar: note.bar })} · ${note.text}` : note.text,
    })),
  );
  const search = new URLSearchParams(window.location.search);

  if (place.stand) {
    const display = readDisplay(chart, { view: search.get("view") ?? undefined });
    return (
      <StandMode
        versionId={song.version_id}
        title={song.title}
        content={song.content}
        section={readSection(chart, search.get("s") ?? undefined)}
        style={display.style}
        homeKey={homeKey}
        theme={search.get("theme") === "stage" ? "stage" : "light"}
        path={`${base}/${song.position}/stand`}
        notes={notes}
        forYou={view.sections.map((section) => section.some((note) => note.forYou))}
        set={{
          href: base,
          name: bundle.set.name,
          songOf: s("songOf", { position: song.position, total }),
          ...(song.position > 1
            ? { previousSong: `${base}/${song.position - 1}/stand?s=999` }
            : {}),
          ...(song.position < total ? { nextSong: `${base}/${song.position + 1}/stand` } : {}),
        }}
      />
    );
  }

  return (
    <main>
      <Layout
        height="auto"
        padding={8}
        contentWidth={1040}
        header={
          <LayoutHeader hasDivider>
            <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href={base}>{bundle.set.name}</BreadcrumbItem>
                  <BreadcrumbItem>{s("songOf", { position: song.position, total })}</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>{song.title}</Heading>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Token label={`${c("key")} ${keyName(homeKey)}`} size="sm" />
                  {keyName(homeKey) !== keyName(chart.key) && (
                    <Text type="supporting">{c("writtenIn", { key: keyName(chart.key) })}</Text>
                  )}
                </HStack>
                <Text color="secondary">
                  {song.role === "musician"
                    ? s("notesForYou", { count: view.forYou })
                    : s("allNotesMd")}
                </Text>
              </VStack>
              {/* Plain links: the reader works with no internet, from this device. */}
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Button
                  label={s("previousSong")}
                  href={`${base}/${song.position - 1}`}
                  isDisabled={song.position <= 1}
                />
                <Button
                  label={s("nextSong")}
                  href={`${base}/${song.position + 1}`}
                  isDisabled={song.position >= total}
                />
                <Button
                  label={s("startStand")}
                  variant="primary"
                  href={`${base}/${song.position}/stand`}
                />
              </HStack>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent isScrollable={false}>
            <VStack gap={5}>
              {banner}
              <OfflineChanges setId={bundle.set.id} />
              <ChartPreview chart={chart} homeKey={homeKey} isFramed hasForm notes={notes} />
            </VStack>
          </LayoutContent>
        }
      />
    </main>
  );
}
