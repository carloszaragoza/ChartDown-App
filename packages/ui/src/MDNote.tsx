import { InstrumentTag } from "./InstrumentTag";

/** A note from the chart or from a band's layer: who it is for and what it says. */
export interface MDNoteData {
  md: boolean;
  roles: string[];
  text: string;
}

export interface MDNoteProps {
  note: MDNoteData;
  /** The instrument's name in the interface language. */
  instrumentName: (id: string) => string;
}

const forEveryone = (note: MDNoteData) =>
  note.roles.length === 0 || note.roles.includes("everyone");

/**
 * A music director note (Design Handoff 3): the word MD for the whole band, an InstrumentTag
 * per instrument, or a plain note in ink-muted. Never color alone: the label carries the meaning.
 */
export function MDNote({ note, instrumentName }: MDNoteProps) {
  if (!note.md) return <p className="cd-note cd-note--plain">{note.text}</p>;
  return (
    <p className="cd-note">
      {forEveryone(note) ? (
        <span className="cd-note__md">MD</span>
      ) : (
        note.roles.map((role) => (
          <InstrumentTag key={role} instrument={role} label={instrumentName(role)} />
        ))
      )}
      <span className="cd-note__text">{note.text}</span>
    </p>
  );
}

/** Everyone's notes first, then instrument notes, then plain notes, each group in written order. */
export function orderNotes<T extends MDNoteData>(notes: readonly T[]): T[] {
  const rank = (note: T) => (!note.md ? 2 : forEveryone(note) ? 0 : 1);
  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => rank(a.note) - rank(b.note) || a.index - b.index)
    .map(({ note }) => note);
}
