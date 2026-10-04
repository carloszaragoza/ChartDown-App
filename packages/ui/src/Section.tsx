import {
  sectionLength,
  type ChordFormatter,
  type Section as SectionData,
  type SectionLength,
} from "@chartdown/core";
import { BarRow, type BarLabels } from "./Bar";
import { MDNote, orderNotes, type MDNoteData } from "./MDNote";

export interface SectionLabels {
  /** The section's length, for example "8 bars" or "4 bars ×2". */
  length: (length: SectionLength) => string;
  /** Lead-in of the next-section preview, for example "Next". */
  next: string;
  /** Added to the preview when the next section has notes for this player. */
  notesForYou: string;
  bar: BarLabels;
}

export interface SectionProps {
  section: SectionData;
  formatter: ChordFormatter;
  labels: SectionLabels;
  /** The notes this player sees: the chart's and the band layer's, already filtered. Defaults to the chart's. */
  notes?: readonly MDNoteData[];
  size?: "xl" | "md";
  id?: string;
}

/** A section card (Design Handoff 3): name, length, the notes before the bars, then its rows. */
export function Section({
  section,
  formatter,
  labels,
  notes = section.notes,
  size = "xl",
  id,
}: SectionProps) {
  return (
    <section className="cd-section" aria-label={section.name} id={id}>
      <header className="cd-section__header">
        <h2 className="cd-section__title">{section.name}</h2>
        <span className="cd-section__length">{labels.length(sectionLength(section))}</span>
      </header>
      {orderNotes(notes).map((note, index) => (
        <MDNote key={index} note={note} instrumentName={labels.bar.instrument} />
      ))}
      {section.rows.map((row, index) => (
        <BarRow key={index} row={row} formatter={formatter} size={size} labels={labels.bar} />
      ))}
    </section>
  );
}

export interface NextSectionProps {
  section: SectionData;
  formatter: ChordFormatter;
  labels: SectionLabels;
  hasNotesForYou?: boolean;
}

/** The quiet preview of the next section: its name, length and first row, small and muted. */
export function NextSection({
  section,
  formatter,
  labels,
  hasNotesForYou = false,
}: NextSectionProps) {
  const first = section.rows[0];
  return (
    <div className="cd-next">
      <p className="cd-next__title">
        {labels.next}: <b>{section.name}</b> · {labels.length(sectionLength(section))}
        {hasNotesForYou && ` · ${labels.notesForYou}`}
      </p>
      {first && <BarRow row={first} formatter={formatter} size="sm" labels={labels.bar} />}
    </div>
  );
}
