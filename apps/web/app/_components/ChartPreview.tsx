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
  type Section,
} from "chartdown";
import {
  BarRow,
  formStripItems,
  MDNotes,
  type FormStripItem,
  type MDNoteData,
  type SectionLabels,
} from "@chartdown/ui";
import { Button } from "@astryxdesign/core/Button";
import { useTranslations } from "next-intl";
import { useChartLabels } from "./chartLabels";

export interface ChartSectionProps {
  section: Section;
  formatter: ChordFormatter;
  labels: SectionLabels;
  /** The notes shown on it; the chart's own by default. */
  notes?: readonly MDNoteData[];
  id?: string;
  /** In a card, as in stand mode; plain in the editors' previews. */
  isFramed?: boolean;
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
}: ChartSectionProps) {
  const body = (
    <section aria-label={section.name} {...(id ? { id } : {})}>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>{section.name}</Heading>
          <Text type="supporting">{labels.length(sectionLength(section))}</Text>
        </HStack>
        <MDNotes notes={notes ?? section.notes} instrumentName={labels.bar.instrument} />
        {section.rows.map((row, index) => (
          <BarRow key={index} row={row} formatter={formatter} labels={labels.bar} />
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
}: {
  chart: Chart;
  style?: ChordStyle;
  homeKey?: Key;
  isFramed?: boolean;
  /** The song form above the sections, each abbreviation a link to its section. */
  hasForm?: boolean;
  /** The notes to show on each section, by its index; the chart's own by default. */
  notes?: (index: number) => readonly MDNoteData[];
}) {
  const labels = useChartLabels();
  const c = useTranslations("chart");
  const formatter = chordFormatter(chart, homeKey ? { style, key: homeKey } : { style });
  const describe = (item: FormStripItem) => `${item.name}, ${labels.length(item.length)}`;
  return (
    <VStack gap={6}>
      {hasForm && (
        <nav aria-label={c("songForm")}>
          <HStack gap={1} wrap="wrap">
            {formStripItems(chart, -1, () => false).map((item, index) => (
              <Button
                key={index}
                label={describe(item)}
                href={`#section-${index + 1}`}
                variant="ghost"
              >
                {item.abbreviation}
              </Button>
            ))}
          </HStack>
        </nav>
      )}
      {chart.sections.map((section, index) => (
        <ChartSection
          key={index}
          section={section}
          formatter={formatter}
          labels={labels}
          id={`section-${index + 1}`}
          isFramed={isFramed}
          {...(notes ? { notes: notes(index) } : {})}
        />
      ))}
    </VStack>
  );
}
