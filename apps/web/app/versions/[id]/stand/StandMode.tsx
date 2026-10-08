"use client";

import { Theme } from "@astryxdesign/core";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { chartdownStandTheme } from "../../../../theme/chartdown-stand";
import { chordFormatter, keyName, parse, sectionLength, type Key } from "chartdown";
import {
  BarRow,
  formStripItems,
  hasPickup,
  type FormStripItem,
  type MDNoteData,
} from "@chartdown/ui";
import { ArrowUturnLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { ChartSection } from "../../../_components/ChartPreview";
import { SongForm } from "../../../_components/SongForm";
import { useChartLabels } from "../../../_components/chartLabels";
import type { Display } from "../display";
import { readSection, standHref, type StandTheme } from "./standHref";

export interface StandModeProps {
  versionId: string;
  title: string;
  content: string;
  section: number;
  style: Display["style"];
  homeKey: Key;
  theme: StandTheme;
  /** Where this stand mode lives; the version's by default. */
  path?: string;
  /** Kept in every address of this page, such as View as (`as=bass`). */
  keep?: Record<string, string>;
  /** In a set (T-802): each section's notes and whether it has notes for this person. */
  notes?: readonly (readonly MDNoteData[])[];
  forYou?: readonly boolean[];
  set?: StandSet;
}

/** A set's stand mode: back to the set, which song this is, View as, and the next songs. */
export interface StandSet {
  href: string;
  name: string;
  songOf: string;
  previousSong?: string;
  nextSong?: string;
  viewAs?: { label: string; options: { label: string; href: string; current: boolean }[] };
}

const noChanges = () => () => {};

/** A link that keeps the section being read, so switching View as stays on it. */
function atSection(href: string, section: number): string {
  if (section === 0) return href;
  return `${href}${href.includes("?") ? "&" : "?"}s=${section + 1}`;
}

// Keys that page-turner pedals and keyboards send.
const FORWARD = new Set(["ArrowRight", "ArrowDown", "PageDown", " "]);
const BACK = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

/**
 * Stand mode (R-03.3): the current section in chord-xl, the next in chord-sm, and one tap to
 * move on. Every control is a plain link, so it works without JavaScript; with it, moving is
 * instant and the address follows.
 */
export function StandMode({
  versionId,
  title,
  content,
  section: initial,
  style,
  homeKey,
  theme,
  path = `/versions/${versionId}/stand`,
  keep = {},
  notes,
  forYou = [],
  set,
}: StandModeProps) {
  const t = useTranslations("stand");
  const c = useTranslations("chart");
  const v = useTranslations("viewer");
  const labels = useChartLabels();
  const chart = useMemo(() => parse(content), [content]);
  const [current, setCurrent] = useState(() => readSection(chart, String(initial + 1)));
  // Whether the browser can go full screen; never on the server.
  const canFullscreen = useSyncExternalStore(
    noChanges,
    () => Boolean(document.documentElement.requestFullscreen),
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const atEdge = useRef({ first: true, last: false });
  const display: Display = { style, key: homeKey };
  const formatter = chordFormatter(chart, { style, key: homeKey });
  const last = chart.sections.length - 1;
  const href = (section: number, changes: Partial<{ display: Display; theme: StandTheme }> = {}) =>
    standHref(
      path,
      { section, display: changes.display ?? display, theme: changes.theme ?? theme },
      chart,
      keep,
    );

  // Moves to a section (or by a step from the current one) and keeps the address in step.
  const move = useCallback(
    (to: (now: number) => number) =>
      setCurrent((now) => {
        const next = Math.min(Math.max(to(now), 0), last);
        window.history.replaceState(
          null,
          "",
          standHref(path, { section: next, display, theme }, chart, keep),
        );
        return next;
      }),
    // display and theme come from the address, so they only change with a new page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [last, path, chart],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea"))
        return;
      if (FORWARD.has(event.key)) {
        event.preventDefault();
        // At a song's edge, the pedal goes on to the next song of the set.
        if (atEdge.current.last && set?.nextSong) window.location.assign(set.nextSong);
        else move((now) => now + 1);
      } else if (BACK.has(event.key)) {
        event.preventDefault();
        if (atEdge.current.first && set?.previousSong) window.location.assign(set.previousSong);
        else move((now) => now - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, set?.nextSong, set?.previousSong]);

  const items = formStripItems(chart, current, (index) => Boolean(forYou[index])).map(
    (item, index) => ({
      ...item,
      href: href(index),
    }),
  );
  const sectionHrefs = items.map((item) => item.href);
  // A link to another section of this song (FormStrip, Previous, Next) moves without a page load.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest("a");
    const section = link ? sectionHrefs.indexOf(link.getAttribute("href") ?? "") : -1;
    if (section < 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    move(() => section);
  };
  const describe = (item: FormStripItem) =>
    [
      item.name,
      labels.length(item.length),
      item.state === "played" ? c("played") : item.state === "current" ? c("now") : "",
    ]
      .filter(Boolean)
      .join(", ");
  useEffect(() => {
    atEdge.current = { first: current === 0, last: current === last };
  }, [current, last]);
  const now = chart.sections[current];
  const next = chart.sections[current + 1];
  const written = keyName(chart.key);
  const shown = keyName(homeKey);

  const viewAs = set?.viewAs;
  const chooseView = (label: string) => {
    const option = viewAs?.options.find((item) => item.label === label);
    if (option && !option.current) window.location.assign(atSection(option.href, current));
  };

  return (
    <div ref={root} onClickCapture={onClickCapture}>
      <Theme theme={chartdownStandTheme} mode={theme === "stage" ? "dark" : "light"}>
        {/* Stand mode fills the screen in its own mode (light or stage), so it paints its own
            background from that mode's tokens. */}
        <div
          data-stand={theme}
          style={{ background: "var(--color-background-body)", color: "var(--color-text-primary)" }}
        >
          <VStack height="100dvh" gap={3} padding={4}>
            {/* Back to the set or the version, where we are, View as in a set, and Previous and
              Next (Design Handoff 2.0 screen 03). */}
            <nav aria-label={set ? t("setBar") : t("turn")}>
              <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                <HStack gap={2} vAlign="center">
                  <Button
                    label={set ? t("set") : t("close")}
                    href={set ? set.href : `/versions/${versionId}`}
                    as={Link}
                    variant="ghost"
                    icon={<Icon icon={ArrowUturnLeftIcon} />}
                  />
                  <VStack gap={0}>
                    {set && <Text weight="semibold">{set.name}</Text>}
                    <Text type="supporting">
                      {set
                        ? set.songOf
                        : t("position", { current: current + 1, total: chart.sections.length })}
                    </Text>
                  </VStack>
                </HStack>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  {viewAs && (
                    <SegmentedControl
                      label={t("viewAs")}
                      value={viewAs.options.find((option) => option.current)?.label ?? ""}
                      onChange={chooseView}
                    >
                      {viewAs.options.map((option) => (
                        <SegmentedControlItem
                          key={option.href}
                          value={option.label}
                          label={option.label}
                        />
                      ))}
                    </SegmentedControl>
                  )}
                  {current > 0 ? (
                    <Button
                      label={t("previous")}
                      size="lg"
                      href={href(current - 1)}
                      icon={<Icon icon={ChevronLeftIcon} />}
                    />
                  ) : (
                    set?.previousSong && (
                      <Button
                        label={t("previousSong")}
                        size="lg"
                        href={set.previousSong}
                        icon={<Icon icon={ChevronLeftIcon} />}
                      />
                    )
                  )}
                  {current < last ? (
                    <Button
                      label={t("next")}
                      size="lg"
                      href={href(current + 1)}
                      variant="primary"
                      endContent={<Icon icon={ChevronRightIcon} />}
                    />
                  ) : (
                    set?.nextSong && (
                      <Button
                        label={t("nextSong")}
                        size="lg"
                        href={set.nextSong}
                        variant="primary"
                        endContent={<Icon icon={ChevronRightIcon} />}
                      />
                    )
                  )}
                </HStack>
              </HStack>
            </nav>

            <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Heading level={1}>{title}</Heading>
                <Token label={`${c("key")} ${shown}`} size="sm" />
                {shown !== written && <Token label={c("writtenIn", { key: written })} size="sm" />}
                {chart.header.meter && <Token label={chart.header.meter} size="sm" />}
                {chart.header.tempo && <Token label={`${chart.header.tempo} bpm`} size="sm" />}
              </HStack>
              <nav aria-label={t("tools")}>
                <HStack gap={2} wrap="wrap">
                  <Button
                    label={style === "letters" ? v("numbers") : v("letters")}
                    href={href(current, {
                      display: { ...display, style: style === "letters" ? "numbers" : "letters" },
                    })}
                    as={Link}
                    variant="secondary"
                  />
                  <Button
                    label={theme === "stage" ? t("light") : t("stage")}
                    href={href(current, { theme: theme === "stage" ? "light" : "stage" })}
                    as={Link}
                    variant="secondary"
                  />
                  {canFullscreen && (
                    <Button
                      label={t("fullscreen")}
                      variant="secondary"
                      onClick={() =>
                        document.fullscreenElement
                          ? void document.exitFullscreen()
                          : void root.current?.requestFullscreen()
                      }
                    />
                  )}
                </HStack>
              </nav>
            </HStack>

            <SongForm
              label={c("songForm")}
              size="lg"
              current={current}
              notesLabel={labels.notesForYou}
              items={items.map((item) => ({
                abbreviation: item.abbreviation,
                description: describe(item),
                href: item.href,
                hasNotes: item.hasNotes,
              }))}
            />

            {/* The current section sits right under the song form, with the next one right after
              it; when it is taller than the screen it scrolls inside its own area (F-001). */}
            <main aria-live="polite" style={{ flex: "0 1 auto", minHeight: 0, overflowY: "auto" }}>
              {now && (
                <ChartSection
                  key={current}
                  section={now}
                  formatter={formatter}
                  labels={labels}
                  notes={notes ? (notes[current] ?? []) : now.notes}
                  id="current-section"
                  isFramed
                  meter={chart.meter}
                  size="lg"
                />
              )}
            </main>

            <VStack gap={2}>
              {next ? (
                <>
                  <Text type="supporting">
                    {labels.next}: <b>{next.name}</b> ·{" "}
                    {labels.length(sectionLength(next), { pickup: hasPickup(next) })}
                    {forYou[current + 1] && ` · ${labels.notesForYou}`}
                  </Text>
                  {next.rows[0] && (
                    <BarRow
                      row={next.rows[0]}
                      formatter={formatter}
                      labels={labels.bar}
                      meter={chart.meter}
                      size="sm"
                    />
                  )}
                </>
              ) : (
                <Text type="supporting">{t("end")}</Text>
              )}
            </VStack>
          </VStack>
        </div>
      </Theme>
    </div>
  );
}
