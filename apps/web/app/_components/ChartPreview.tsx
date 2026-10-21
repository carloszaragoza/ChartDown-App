"use client";

import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import {
  chordFormatter,
  type Chart,
  type ChordFormatter,
  type ChordStyle,
  type Key,
  type Meter,
  type Section,
} from "chartdown";
import {
  BarRow,
  formStripItems,
  hasPickup,
  MDNotes,
  type BeatsMode,
  type FormStripItem,
  type MDNoteData,
  type SectionLabels,
  playedLength,
} from "@chartdown/ui";
import { Theme } from "@astryxdesign/core";
import { chartdownStandTheme } from "../../theme/chartdown-stand";
import { usePhone } from "../../lib/shell/phone";
import { useMetronomeControls } from "./MetronomeControls";
import { SongForm } from "./SongForm";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";
import { barIn, usePlaybackBar } from "./usePlaybackBar";
import { useChartLabels } from "./chartLabels";
import { hasJump, playRuns } from "../../lib/chart/playRuns";

export interface ChartSectionProps {
  section: Section;
  formatter: ChordFormatter;
  labels: SectionLabels;
  /** The notes shown on it; the chart's own by default. */
  notes?: readonly MDNoteData[];
  id?: string;
  /** In a card, as in stand mode; plain in the editors' previews. */
  isFramed?: boolean;
  /** The chart's meter, for each bar's beats. */
  meter?: Meter;
  /** "lg" in stand mode; "md" in the viewer and the editors (CHART-VIEWER.md 2). */
  size?: "lg" | "md";
  /** How many bars show beat marks (R-03.7); Auto, the default, where they tell something. */
  beats?: BeatsMode;
  /** The bar the metronome is on: its row, its place in the row, and how far into it (R-11.3). */
  now?: { row: number; index: number; progress: number; downbeat?: boolean } | undefined;
  /** The bar the metronome will start on: its row and its place in the row (R-11.2). */
  start?: { row: number; index: number } | undefined;
  /** A section played more than once: "3 times", or "Time 2 of 3" while it plays (T-2704). */
  times?: string | undefined;
  /** Before the section's name, such as stand mode's Now tag (R-03.12). */
  badge?: ReactNode;
}

/**
 * One section of a chart as Design Handoff 2.0 draws it: the section's name and length, its
 * notes, and its bars as BarRows.
 */
export function ChartSection({
  section,
  formatter,
  labels,
  notes,
  id,
  isFramed = false,
  meter,
  size = "md",
  beats = "auto",
  now,
  start,
  times,
  badge,
}: ChartSectionProps) {
  const body = (
    <section aria-label={section.name} {...(id ? { id } : {})}>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          {badge}
          <Heading level={2}>{section.name}</Heading>
          <Text type="supporting">
            {labels.length(playedLength(section), { pickup: hasPickup(section) })}
          </Text>
          {times && <Token label={times} size="sm" color="blue" />}
        </HStack>
        <MDNotes notes={notes ?? section.notes} instrumentName={labels.bar.instrument} />
        {section.rows.map((row, index) => (
          <BarRow
            key={index}
            row={row}
            formatter={formatter}
            labels={labels.bar}
            size={size}
            beats={beats}
            {...(meter ? { meter } : {})}
            {...(now?.row === index
              ? {
                  now: {
                    index: now.index,
                    progress: now.progress,
                    downbeat: now.downbeat === true,
                  },
                }
              : {})}
            {...(start?.row === index ? { start: start.index } : {})}
          />
        ))}
      </VStack>
    </section>
  );
  return isFramed ? <Card>{body}</Card> : body;
}

/**
 * Every section of a chart, as numbers or letters and in its written key unless another is given
 * (R-03.2), with no band's layer (R-06.5). The editors' live preview (R-03.1) and, with its song
 * form and framed sections, the version page.
 */
export function ChartPreview({
  chart,
  style = "numbers",
  homeKey,
  isFramed = false,
  hasForm = false,
  notes,
  beats = "auto",
  phone = false,
}: {
  chart: Chart;
  style?: ChordStyle;
  homeKey?: Key;
  isFramed?: boolean;
  /** The song form above the sections, each abbreviation a link to its section. */
  hasForm?: boolean;
  /**
   * The notes to show on each section, by its index; the chart's own by default. A list, not a
   * function, so a server component can pass it.
   */
  notes?: readonly (readonly MDNoteData[])[];
  /** How many bars show beat marks (R-03.7); Auto by default. */
  beats?: BeatsMode;
  /** The server's guess that this is a phone, where the song form is one strip (R-03.8). */
  phone?: boolean;
}) {
  const isPhone = usePhone(phone);
  const labels = useChartLabels();
  const c = useTranslations("chart");
  const formatter = chordFormatter(chart, homeKey ? { style, key: homeKey } : { style });
  const describe = (item: FormStripItem) => `${item.name}, ${labels.length(item.length)}`;
  // The visual metronome on the version page (T-1503): Play in the pinned bar, from the song's
  // start, and the page keeps the bar being played in view.
  const {
    control,
    tempoDialog,
    counter,
    nowIn,
    playingSection,
    isPlaying,
    isWaiting,
    resume,
    chooseStart,
    startIn,
  } = useMetronomeControls(chart, null);
  // The open video or band recording, when it plays, moves the chart as the metronome does.
  const videoBar = usePlaybackBar(chart, isPlaying);
  const nowAt = (index: number) => nowIn(index) ?? barIn(videoBar, index);
  // A tap on the chart: on after a fermata (R-11.6), or, stopped, the bar to start on (R-11.2).
  const onTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasForm) return;
    if (isWaiting) return resume();
    const bar = (event.target as HTMLElement).closest<HTMLElement>(".cd-chart__bar");
    const section = bar?.closest("section[id^='section-']")?.id.replace("section-", "");
    if (isPlaying || !bar || !section) return;
    chooseStart(Number(section) - 1, Number(bar.dataset.bar));
  };
  const root = useRef<HTMLDivElement>(null);
  const playingRow =
    playingSection !== undefined
      ? `${playingSection}:${nowIn(playingSection)?.row}`
      : videoBar
        ? `${videoBar.section}:${videoBar.row}`
        : "";
  useEffect(() => {
    if (!playingRow) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
  }, [playingRow]);
  const form = (
    <SongForm
      label={c("songForm")}
      size="lg"
      isStrip={isPhone}
      items={formStripItems(chart, -1, () => false).map((item, index) => ({
        abbreviation: item.abbreviation,
        description: describe(item),
        href: `#section-${index + 1}`,
      }))}
    />
  );
  const counterText = counter && (
    <Text type="large" weight="bold">
      {counter}
    </Text>
  );
  return (
    <div ref={root} onClick={onTap}>
      <VStack gap={6}>
        {hasForm && (
          // The song form stays pinned at the top while the chart scrolls, at stand mode's size,
          // so any section is one tap away (Design Handoff 2.0, 1.5).
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              // The page's own surface, so the chart passes under it unseen.
              background: "var(--color-background-surface)",
              paddingBlock: "var(--spacing-2)",
            }}
          >
            <Theme theme={chartdownStandTheme} mode="system">
              {/* On a phone the metronome sits on its own line, under the strip (R-03.9). */}
              {isPhone ? (
                <VStack gap={2}>
                  {form}
                  <HStack gap={2} vAlign="center" hAlign="end">
                    {!isPlaying && counterText}
                    {control}
                  </HStack>
                </VStack>
              ) : (
                <HStack gap={2} vAlign="center">
                  <StackItem size="fill">{form}</StackItem>
                  {!isPlaying && counterText}
                  {control}
                </HStack>
              )}
              {tempoDialog}
            </Theme>
          </div>
        )}
        {hasForm && hasJump(chart) && (
          // Only a song that jumps (D.S., D.C.) needs its order spelled out (spec 10.1).
          <Text type="supporting">
            <b>{c("playOrder")}</b>{" "}
            {playRuns(chart)
              .map((run) => {
                const name = chart.sections[run.section]?.name ?? "";
                return run.full
                  ? name
                  : c("playOrderBars", { section: name, from: run.from, to: run.to });
              })
              .join(" → ")}
          </Text>
        )}
        {chart.sections.map((section, index) => (
          <ChartSection
            key={index}
            section={section}
            formatter={formatter}
            labels={labels}
            id={`section-${index + 1}`}
            isFramed={isFramed}
            meter={chart.meter}
            beats={beats}
            {...(notes ? { notes: notes[index] ?? [] } : {})}
            now={nowAt(index)}
            start={startIn(index)}
          />
        ))}
      </VStack>
    </div>
  );
}
