import { chordFormatter, sectionLength, type Chart } from "chartdown";
import { Icon, LegacyBarRow, MDNote, type MDNoteData } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useChartLabels } from "../../../_components/chartLabels";
import styles from "./notes.module.css";

export interface SectionNote extends MDNoteData {
  /** Set for the band's notes, which the MD edits; the author's are not editable here. */
  editHref?: string;
  editLabel?: string;
}

/**
 * The chosen section in the layer editor (`design/screens/06-md-layer-editor.html`): its name and
 * length, its notes (the band's with an edit button), its bars, and the note form below.
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
    <section
      className={styles.sectionCard}
      aria-labelledby="chosen-section"
      id={`section-${index + 1}`}
    >
      <h2 id="chosen-section" className={styles.sectionTitle}>
        {section.name}{" "}
        <span className={styles.sectionLength}>{labels.length(sectionLength(section))}</span>
      </h2>
      <ul className={styles.noteList} aria-label={t("sectionNotes", { section: section.name })}>
        {notes.map((note, position) => (
          <li key={position} className={styles.noteRow}>
            <MDNote note={note} instrumentName={labels.bar.instrument} />
            {note.editHref && (
              <Link href={note.editHref} className={styles.iconButton} aria-label={note.editLabel}>
                <Icon name="edit" size={20} />
              </Link>
            )}
          </li>
        ))}
      </ul>
      {section.rows.map((row, position) => (
        <LegacyBarRow
          key={position}
          row={row}
          formatter={formatter}
          size="md"
          labels={labels.bar}
        />
      ))}
      <hr className={styles.rule} />
      {children}
    </section>
  );
}
