import type { SetBundle } from "./store";

/** One thing that changed in a downloaded set while the person was offline (R-08.3). */
export type Change =
  | { kind: "name"; from: string; to: string }
  | { kind: "when"; from: string | null; to: string | null }
  | { kind: "songAdded"; title: string }
  | { kind: "songRemoved"; title: string }
  | { kind: "songMoved"; title: string; from: number; to: number }
  | { kind: "key"; title: string; from: string | null; to: string | null }
  | { kind: "revision"; title: string; from: number; to: number }
  | {
      kind: "noteAdded" | "noteChanged" | "noteRemoved";
      title: string;
      section: string;
      text: string;
    }
  | { kind: "lineup"; name: string; from: string[]; to: string[] };

const when = (set: SetBundle["set"]) =>
  set.date ? [set.date, set.time?.slice(0, 5)].filter(Boolean).join(" ") : null;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What changed between the bundle kept on the device and the current one (R-08.3). Songs are
 * matched by their place in the set (item), notes by their id; the notes are only the person's,
 * since the bundle holds no others.
 */
export function setChanges(before: SetBundle, after: SetBundle): Change[] {
  if (before.stamp === after.stamp) return [];
  const changes: Change[] = [];
  if (before.set.name !== after.set.name)
    changes.push({ kind: "name", from: before.set.name, to: after.set.name });
  if (when(before.set) !== when(after.set))
    changes.push({ kind: "when", from: when(before.set), to: when(after.set) });

  const old = new Map(before.songs.map((song) => [song.item_id, song]));
  const current = new Map(after.songs.map((song) => [song.item_id, song]));
  for (const song of after.songs) {
    const was = old.get(song.item_id);
    if (!was) {
      changes.push({ kind: "songAdded", title: song.title });
      continue;
    }
    if (was.position !== song.position)
      changes.push({ kind: "songMoved", title: song.title, from: was.position, to: song.position });
    if ((was.set_key ?? null) !== (song.set_key ?? null))
      changes.push({
        kind: "key",
        title: song.title,
        from: was.set_key ?? null,
        to: song.set_key ?? null,
      });
    if (was.revision_number !== song.revision_number)
      changes.push({
        kind: "revision",
        title: song.title,
        from: was.revision_number,
        to: song.revision_number,
      });
    const notesBefore = new Map(was.notes.map((note) => [note.id, note]));
    const notesNow = new Map(song.notes.map((note) => [note.id, note]));
    for (const note of song.notes) {
      const prior = notesBefore.get(note.id);
      if (!prior)
        changes.push({
          kind: "noteAdded",
          title: song.title,
          section: note.section,
          text: note.text,
        });
      else if (
        prior.text !== note.text ||
        prior.section !== note.section ||
        prior.occurrence !== note.occurrence ||
        prior.bar !== note.bar ||
        !same(prior.instruments, note.instruments)
      )
        changes.push({
          kind: "noteChanged",
          title: song.title,
          section: note.section,
          text: note.text,
        });
    }
    for (const note of was.notes)
      if (!notesNow.has(note.id))
        changes.push({
          kind: "noteRemoved",
          title: song.title,
          section: note.section,
          text: note.text,
        });
  }
  for (const song of before.songs)
    if (!current.has(song.item_id)) changes.push({ kind: "songRemoved", title: song.title });

  const lineupBefore = new Map(before.lineup.map((member) => [member.name, member.instruments]));
  for (const member of after.lineup) {
    const prior = lineupBefore.get(member.name) ?? [];
    if (!same(prior, member.instruments))
      changes.push({ kind: "lineup", name: member.name, from: prior, to: member.instruments });
  }
  return changes;
}
