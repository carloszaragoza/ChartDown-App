import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { chordFormatter, sectionLength, type Chart } from "chartdown";
import { BarRow, hasPickup, MDNotes, type MDNoteData } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { EditIcon } from "../../../_components/ActionIcons";
import { useChartLabels } from "../../../_components/chartLabels";

export interface SectionNote extends MDNoteData {
  /** Set for the band's notes, which the MD edits; the author's are not editable here. */
  editHref?: string;
  editLabel?: string;
}

/**
 * The chosen section in the layer editor (Design Handoff 2.0 screen 07): its name and length,
 * its notes (the band's with an edit button), its bars, and the note form below.
 */
export function SectionView({
  chart,
  index,
  notes,
  children,
}: {
  chart: Chart;
  index: number;
  notes: SectionNote[];
  children: ReactNode;
}) {
  const labels = useChartLabels();
  const t = useTranslations("notes");
  const section = chart.sections[index];
  if (!section) return null;
  const formatter = chordFormatter(chart, { style: "numbers" });
  return (
    <section aria-labelledby="chosen-section" id={`section-${index + 1}`}>
      <VStack gap={5}>
        <HStack gap={2} vAlign="center">
          <Heading level={2} id="chosen-section">
            {section.name}
          </Heading>
          <Text type="supporting">
            {labels.length(sectionLength(section), { pickup: hasPickup(section) })}
          </Text>
        </HStack>
        {notes.length > 0 && (
          <List
            hasDividers
            edgeCompensation="inline"
            header={
              <Text className="cd-visually-hidden">
                {t("sectionNotes", { section: section.name })}
              </Text>
            }
          >
            {notes.map((note, position) => (
              <Item
                key={position}
                as="li"
                label={<MDNotes notes={[note]} instrumentName={labels.bar.instrument} />}
                {...(note.editHref
                  ? {
                      endContent: (
                        <Button
                          label={note.editLabel ?? ""}
                          isIconOnly
                          variant="ghost"
                          href={note.editHref}
                          icon={<EditIcon />}
                        />
                      ),
                    }
                  : {})}
              />
            ))}
          </List>
        )}
        <VStack gap={3}>
          {section.rows.map((row, position) => (
            <BarRow
              key={position}
              row={row}
              formatter={formatter}
              labels={labels.bar}
              meter={chart.meter}
              size="md"
            />
          ))}
        </VStack>
        <Divider />
        {children}
      </VStack>
    </section>
  );
}
