import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { Icon } from "./Icon";
import { hasInstrumentIcon } from "./icons";
import { passesText } from "./BarRow";
import { orderNotes, type MDNoteData } from "./MDNote";

export interface MDNotesProps {
  notes: readonly MDNoteData[];
  /** The instrument's name in the interface language. */
  instrumentName: (id: string) => string;
  /** At most this many, closer together, and how many more there are (a preview, T-2703). */
  limit?: { count: number; more: (count: number) => string } | undefined;
}

const forEveryone = (note: MDNoteData) =>
  note.roles.length === 0 || note.roles.includes("everyone");

/**
 * A section's notes (Design Handoff 2.0, section 3): a red Token with "MD" for the whole band, or
 * the instrument's name and icon, then the note. Never color alone: the Token's word carries the
 * meaning. Notes that aren't the music director's are plain secondary text.
 */
export function MDNotes({ notes, instrumentName, limit }: MDNotesProps) {
  const ordered = orderNotes(notes);
  const shown = limit ? ordered.slice(0, limit.count) : ordered;
  const hidden = ordered.length - shown.length;
  return (
    <VStack gap={limit ? 1 : 2}>
      {shown.map((note, index) =>
        note.md ? (
          <HStack key={index} gap={2} vAlign="center" wrap="wrap">
            {/* A note for one pass says so in words: "2x" before who it is for (spec 9.1). */}
            {note.passes && note.passes.length > 0 && (
              <Token label={passesText(note.passes)} color="red" size="sm" />
            )}
            {forEveryone(note) ? (
              <Token label="MD" color="red" size="sm" />
            ) : (
              note.roles.map((role) => (
                <Token
                  key={role}
                  label={instrumentName(role)}
                  color="red"
                  size="sm"
                  {...(hasInstrumentIcon(role) ? { icon: <Icon name={role} size={16} /> } : {})}
                />
              ))
            )}
            <Text>{note.text}</Text>
          </HStack>
        ) : (
          <Text key={index} color="secondary" as="p">
            {note.text}
          </Text>
        ),
      )}
      {limit && hidden > 0 && <Text type="supporting">{limit.more(hidden)}</Text>}
    </VStack>
  );
}
