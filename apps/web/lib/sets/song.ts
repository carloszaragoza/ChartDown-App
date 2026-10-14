import { EVERYONE, placeLayer, type Chart, type LayerNote, type UnplacedNote } from "chartdown";

/** What `set_song` returns: a set's song as the person opening it may see it (T-801). */
export interface SetSong {
  set_id: string;
  set_name: string;
  position: number;
  item_id: string;
  version_id: string;
  title: string;
  author_name: string;
  set_key: string | null;
  revision_id: string;
  revision_number: number;
  current_revision_id: string | null;
  content: string;
  role: "md" | "temp_md" | "musician";
  instruments: string[];
  hide_author_notes: boolean;
  notes: {
    id: string;
    section: string;
    occurrence: number;
    bar: number | null;
    text: string;
    anchored_revision_id: string;
    /** The passes the note is for; missing or empty means every pass. */
    passes?: number[];
    instruments: string[];
  }[];
}

export interface ShownNote {
  md: boolean;
  roles: string[];
  /** The passes of a repeat the note is for; empty for every pass. */
  passes: number[];
  text: string;
  bar?: number;
  /** For this person's instruments, rather than for everyone. */
  forYou: boolean;
}

export interface SongView {
  /** The notes on each section, by its index: the author's (if shown) and the band's. */
  sections: ShownNote[][];
  /** Band notes whose section or bar is no longer in the chart; never lost (R-00.2). */
  unplaced: UnplacedNote[];
  /** How many shown notes are for this person's instruments. */
  forYou: number;
}

/**
 * The notes a person sees on a set's song (R-06.2, R-06.3, R-06.6). The band's notes arrive
 * already filtered by the server; the author's, written in the chart and public, are filtered
 * here with the same rule, and hidden if the band hides them.
 */
export function songView(
  chart: Chart,
  song: Pick<SetSong, "role" | "instruments" | "hide_author_notes" | "notes">,
  anchoredChart?: (revisionId: string) => Chart | undefined,
): SongView {
  const mine = new Set(song.instruments);
  const seesAll = song.role !== "musician";
  const isForMe = (roles: string[]) => roles.some((role) => mine.has(role));
  const visible = (roles: string[]) => seesAll || roles.includes(EVERYONE) || isForMe(roles);

  const layer = {
    notes: song.notes.map((note): LayerNote => ({
      id: note.id,
      revision: note.anchored_revision_id,
      section: note.section,
      occurrence: note.occurrence,
      ...(note.bar ? { bar: note.bar } : {}),
      roles: note.instruments.length > 0 ? note.instruments : [EVERYONE],
      ...(note.passes && note.passes.length > 0 ? { passes: note.passes } : {}),
      text: note.text,
    })),
  };
  const placement = placeLayer(chart, layer, anchoredChart ? { anchoredChart } : {});
  let forYou = 0;
  const shown = (roles: string[], text: string, passes: number[], bar?: number): ShownNote => {
    // Seeing every note, the ones "for you" are those for any instrument rather than everyone.
    const forMe = seesAll ? !roles.includes(EVERYONE) : isForMe(roles);
    if (forMe) forYou += 1;
    return { md: true, roles, passes, text, ...(bar ? { bar } : {}), forYou: forMe };
  };

  const sections = chart.sections.map((section, index) => [
    ...(song.hide_author_notes
      ? []
      : section.notes
          .filter((note) => visible(note.roles))
          .map((note) => ({ ...shown(note.roles, note.text, note.passes), md: note.md }))),
    ...(placement.sections[index] ?? [])
      .filter(({ note }) => visible(note.roles))
      .map(({ note }) => shown(note.roles, note.text, note.passes ?? [], note.bar)),
  ]);
  return { sections, unplaced: placement.unplaced, forYou };
}

/**
 * “View as” (R-06.3): the MD or the set's temporary MD sees the song exactly as a musician
 * playing that instrument would. Nothing changes for a musician, who only has their own notes.
 */
export function viewAs<T extends Pick<SetSong, "role" | "instruments">>(
  song: T,
  as: string | null | undefined,
): T {
  if (song.role === "musician" || !as || as === "all") return song;
  return { ...song, role: "musician", instruments: [as] };
}

/** The instruments the MD may view as: those playing in the set and any with a note here. */
export function viewAsOptions(song: Pick<SetSong, "notes">, playing: string[]): string[] {
  const inNotes = song.notes.flatMap((note) => note.instruments);
  return [...new Set([...playing, ...inNotes])].sort();
}

/**
 * The View as a page may carry (F-006): for the MD and the set's temporary MD, "All notes"
 * (null) and each instrument, every one filtered on the server; for a musician none, so their
 * page carries only their own notes (R-06.4).
 */
export function viewsToSend(
  song: Pick<SetSong, "role" | "notes">,
  playing: string[],
): (string | null)[] {
  if (song.role === "musician") return [];
  return [null, ...viewAsOptions(song, playing)];
}
