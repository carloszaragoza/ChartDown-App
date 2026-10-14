"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { useOptimistic, type ReactNode } from "react";
import { moveItem, removeItem } from "../../actions";

/** A song of the set as Edit set lists it; the server draws its parts. */
export interface ArrangedSong {
  id: string;
  label: ReactNode;
  description: ReactNode;
  /** The key selector for this song. */
  keySelect: ReactNode;
  /** What the buttons say to a screen reader, with the song's title. */
  names: { up: string; down: string; remove: string };
}

/** A change the music director makes to the order. */
export type Change = { type: "move"; id: string; by: -1 | 1 } | { type: "remove"; id: string };

/** The order after a change, as it shows before the server answers (F-006). */
export function arrange<T extends { id: string }>(songs: readonly T[], change: Change): T[] {
  const from = songs.findIndex((song) => song.id === change.id);
  if (from < 0) return [...songs];
  if (change.type === "remove") return songs.filter((song) => song.id !== change.id);
  const to = from + change.by;
  if (to < 0 || to >= songs.length) return [...songs];
  const next = [...songs];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

/**
 * The set's songs in order, with Up, Down and Remove (R-05.2). A change shows at once while the
 * server saves it; the server's answer replaces it, and a refusal brings back the server's order
 * with its message (F-006).
 */
export function ArrangedSongs({
  setId,
  songs,
  canRemove,
  words,
}: {
  setId: string;
  songs: ArrangedSong[];
  canRemove: boolean;
  words: { up: string; down: string; remove: string };
}) {
  const [shown, change] = useOptimistic<ArrangedSong[], Change>(songs, arrange);
  const hidden = (itemId: string) => (
    <>
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="itemId" value={itemId} />
    </>
  );
  return (
    <List hasDividers edgeCompensation="inline">
      {shown.map((song, index) => (
        <Item
          key={song.id}
          as="li"
          align="start"
          startContent={<Text weight="semibold">{index + 1}</Text>}
          label={song.label}
          description={song.description}
          endContent={
            <HStack gap={1} vAlign="center" wrap="wrap">
              {song.keySelect}
              {index > 0 && (
                <form
                  action={async (form) => {
                    change({ type: "move", id: song.id, by: -1 });
                    await moveItem(form);
                  }}
                >
                  {hidden(song.id)}
                  <input type="hidden" name="position" value={index} />
                  <Button type="submit" variant="ghost" label={song.names.up}>
                    {words.up}
                  </Button>
                </form>
              )}
              {index < shown.length - 1 && (
                <form
                  action={async (form) => {
                    change({ type: "move", id: song.id, by: 1 });
                    await moveItem(form);
                  }}
                >
                  {hidden(song.id)}
                  <input type="hidden" name="position" value={index + 2} />
                  <Button type="submit" variant="ghost" label={song.names.down}>
                    {words.down}
                  </Button>
                </form>
              )}
              {canRemove && (
                <form
                  action={async (form) => {
                    change({ type: "remove", id: song.id });
                    await removeItem(form);
                  }}
                >
                  {hidden(song.id)}
                  <Button type="submit" variant="ghost" label={song.names.remove}>
                    {words.remove}
                  </Button>
                </form>
              )}
            </HStack>
          }
        />
      ))}
    </List>
  );
}
