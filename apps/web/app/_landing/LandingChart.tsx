"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./landing.module.css";

export interface SheetBar {
  dynamic: string | null;
  chords: { root: string; quality: string; bass: string }[];
}

export interface SheetNote {
  /** Who it's for: everyone, or one instrument's id. */
  for: string;
  label: string;
  text: string;
  /** The bar the pen points at, from 1. */
  bar: number;
}

/**
 * The landing's chart sheet (T-1307): an original chorus, its bars drawn from the parser at the
 * scale they have on a music stand, and the music director's red-pen notes in the margin.
 * "View as" rewrites the notes for each player, as the app does for every musician.
 */
export function LandingChart({
  section,
  length,
  bars,
  notes,
  views,
  words,
}: {
  section: string;
  length: string;
  bars: SheetBar[];
  notes: SheetNote[];
  /** The players to view as, "everyone" first. */
  views: { id: string; label: string }[];
  /** `viewing` holds "{instrument}", filled with the player viewed as. */
  words: { viewAs: string; viewing: string; example: string; bar: string };
}) {
  const [view, setView] = useState(views.find((item) => item.id === "drums")?.id ?? "everyone");
  // The first sweep of the chart plays once, in order; after the first choice the pen answers at once.
  const [intro, setIntro] = useState(true);
  const choose = (id: string) => {
    setIntro(false);
    setView(id);
  };
  const shown = notes.filter(
    (note) => note.for === "everyone" || view === "everyone" || note.for === view,
  );
  const circled = new Set(shown.filter((note) => note.for !== "everyone").map((note) => note.bar));
  const current = views.find((item) => item.id === view);
  const group = useRef<HTMLDivElement>(null);
  // A radio group: Tab reaches the chosen player, the arrow keys move between players.
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = views.findIndex((item) => item.id === view);
    const next = views[(index + step + views.length) % views.length];
    if (!next) return;
    choose(next.id);
    group.current?.querySelector<HTMLButtonElement>(`[data-view="${next.id}"]`)?.focus();
  };

  return (
    <figure className={styles.sheetFigure} aria-label={words.example} data-intro={intro || undefined}>
      <div className={styles.sectionLine}>
        <span className={styles.sectionName}>
          <span aria-hidden="true" className={styles.hashes}>
            ##{" "}
          </span>
          {section}
        </span>
        <span className={styles.sectionLength}>· {length}</span>
      </div>
      <div className={styles.bars}>
        {bars.map((bar, index) => (
          <div
            key={index}
            className={styles.bar}
            data-circled={circled.has(index + 1) || undefined}
            style={{ "--i": index } as CSSProperties}
          >
            {bar.dynamic && <span className={styles.dynamic}>{bar.dynamic}</span>}
            <span className={styles.chords}>
              {bar.chords.map((chord, i) => (
                <span key={i} className={styles.chord}>
                  {chord.root}
                  {chord.quality && <sup className={styles.quality}>{chord.quality}</sup>}
                  {chord.bass && `/${chord.bass}`}
                </span>
              ))}
            </span>
            {circled.has(index + 1) && (
              // The pen's circle around the bar a note points at, drawn in again on each view.
              <svg
                key={view}
                className={styles.penCircle}
                viewBox="0 0 120 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  pathLength={100}
                  d="M62 6C30 4 8 22 9 50c1 29 26 45 56 44 31-1 49-19 47-46C110 22 88 7 58 9 44 10 33 14 26 20"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div className={styles.margin}>
        <div
          className={styles.viewAs}
          role="radiogroup"
          aria-label={words.viewAs}
          ref={group}
          onKeyDown={onKey}
        >
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === view}
              tabIndex={option.id === view ? 0 : -1}
              data-view={option.id}
              className={styles.viewOption}
              onClick={() => choose(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={styles.viewing} aria-live="polite">
          {words.viewing.replace("{instrument}", current?.label ?? "")}
        </p>
        <ul className={styles.notes} key={view}>
          {shown.map((note, index) => (
            <li key={`${note.for}-${index}`} className={styles.note}>
              <span className={styles.noteHead}>
                <span className={styles.noteTag}>{note.label}</span>
                {note.for !== "everyone" && (
                  // Which bar the note points at, so the link to the circle survives any layout.
                  <span className={styles.noteBar}>
                    <span aria-hidden="true">→ </span>
                    {words.bar.replace("{bar}", String(note.bar))}
                  </span>
                )}
              </span>
              <span className={styles.noteText}>{note.text}</span>
              <svg
                className={styles.penUnderline}
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path pathLength={100} d="M2 8C40 3 90 10 130 5s50 2 66-1" />
              </svg>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
