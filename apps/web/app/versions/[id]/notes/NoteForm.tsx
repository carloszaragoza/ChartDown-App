"use client";

import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { saveNote } from "./actions";

export interface NoteFormProps {
  versionId: string;
  bandId: string;
  /** The section the page shows, to come back to it. */
  section: number;
  /** The section the note goes in, as "name|occurrence". */
  anchor: string;
  /** Every section a note may move to, when editing. */
  anchors: { value: string; label: string }[];
  /** The instruments a note may be for, in the reader's language. */
  instruments: { id: string; name: string }[];
  /** The note being edited, or null to add one. */
  editing: {
    id: string;
    text: string;
    bar: number | null;
    instrumentIds: string[];
    /** The passes the note is for, as written: "2", "1,3", or "" for every pass. */
    passes: string;
  } | null;
  cancelHref: string;
  words: {
    title: string;
    section: string;
    for: string;
    forHint: string;
    text: string;
    textPlaceholder: string;
    textHint: string;
    bar: string;
    passes: string;
    passesHint: string;
    submit: string;
    cancel: string;
  };
}

/**
 * Adding or editing one of the band's notes (R-03.5; Design Handoff 2.0 screen 07). A note is for
 * everyone, or for **several instruments** at once, so who it's for is a set of checkboxes rather
 * than a single choice. It posts to the server action, which checks it again.
 */
export function NoteForm({
  versionId,
  bandId,
  section,
  anchor: startAnchor,
  anchors,
  instruments,
  editing,
  cancelHref,
  words,
}: NoteFormProps) {
  const [anchor, setAnchor] = useState(startAnchor);
  const [chosen, setChosen] = useState<string[]>(editing?.instrumentIds ?? []);
  const [text, setText] = useState(editing?.text ?? "");
  const [bar, setBar] = useState(editing?.bar ? String(editing.bar) : "");
  const [passes, setPasses] = useState(editing?.passes ?? "");
  const toggle = (id: string, on: boolean) =>
    setChosen((current) => (on ? [...current, id] : current.filter((item) => item !== id)));

  return (
    <form action={saveNote} id="note-form">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="bandId" value={bandId} />
      <input type="hidden" name="section" value={section} />
      {editing && <input type="hidden" name="noteId" value={editing.id} />}
      {!editing && <input type="hidden" name="anchor" value={anchor} />}
      {chosen.map((id) => (
        <input key={id} type="hidden" name="instrument" value={id} />
      ))}
      <VStack gap={4}>
        <Heading level={3}>{words.title}</Heading>
        {editing && (
          // Editing may move a note to another section, as anchoring it again does.
          <Selector
            label={words.section}
            htmlName="anchor"
            options={anchors}
            value={anchor}
            onChange={setAnchor}
          />
        )}
        <VStack gap={2}>
          <Text weight="semibold" id="note-for">
            {words.for}
          </Text>
          <div role="group" aria-labelledby="note-for">
            <Grid columns={{ minWidth: 160 }} gap={1}>
              {instruments.map((instrument) => (
                <CheckboxInput
                  key={instrument.id}
                  label={instrument.name}
                  value={chosen.includes(instrument.id)}
                  onChange={(on) => toggle(instrument.id, on)}
                />
              ))}
            </Grid>
          </div>
          <Text type="supporting">{words.forHint}</Text>
        </VStack>
        <HStack gap={3} vAlign="start">
          <StackItem size="fill">
            <TextInput
              label={words.text}
              htmlName="text"
              value={text}
              onChange={setText}
              placeholder={words.textPlaceholder}
              description={words.textHint}
              width="100%"
            />
          </StackItem>
          <TextInput label={words.bar} htmlName="bar" value={bar} onChange={setBar} width={140} />
          <TextInput
            label={words.passes}
            htmlName="passes"
            value={passes}
            onChange={setPasses}
            description={words.passesHint}
            width={200}
          />
        </HStack>
        <HStack gap={2}>
          <Button
            type="submit"
            variant="primary"
            label={words.submit}
            {...(editing ? {} : { icon: <Icon icon={PlusIcon} /> })}
          />
          {editing && <Button label={words.cancel} href={cancelHref} />}
        </HStack>
      </VStack>
    </form>
  );
}
