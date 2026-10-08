"use client";

import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  chordFormatter,
  sectionLength,
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
} from "@chartdown/ui";
import { Theme } from "@astryxdesign/core";
import { chartdownStandTheme } from "../../theme/chartdown-stand";
import { SongForm } from "./SongForm";
import { useTranslations } from "next-intl";
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
}: ChartSectionProps) {
  const body = (
    <section aria-label={section.name} {...(id ? { id } : {})}>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>{section.name}</Heading>
          <Text type="supporting">
            {labels.length(sectionLength(section), { pickup: hasPickup(section) })}
          </Text>
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
}) {
  const labels = useChartLabels();
  const c = useTranslations("chart");
  const formatter = chordFormatter(chart, homeKey ? { style, key: homeKey } : { style });
  const describe = (item: FormStripItem) => `${item.name}, ${labels.length(item.length)}`;
  return (
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
            <SongForm
              label={c("songForm")}
              size="lg"
              items={formStripItems(chart, -1, () => false).map((item, index) => ({
                abbreviation: item.abbreviation,
                description: describe(item),
                href: `#section-${index + 1}`,
              }))}
            />
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
        />
      ))}
    </VStack>
  );
}
