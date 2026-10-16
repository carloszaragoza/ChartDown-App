"use client";

import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Item } from "@astryxdesign/core/Item";
import { List } from "@astryxdesign/core/List";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Fragment, useRef, useState } from "react";
import { appointTempMd, deleteSet, saveLineup, setSongKey } from "../../actions";

type ISODateString = Exclude<Parameters<typeof DateInput>[0]["value"], undefined>;

/** The key a song is played in, in this set (R-05.4): choosing one saves it. */
export function KeySelect({
  setId,
  itemId,
  label,
  value,
  options,
}: {
  setId: string;
  itemId: string;
  label: string;
  /** The chosen key, or "" for the written one. */
  value: string;
  options: { value: string; label: string }[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [key, setKey] = useState(value);
  return (
    <form action={setSongKey} ref={form}>
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="key" value={key} />
      <Selector
        label={label}
        isLabelHidden
        options={options.map((option) => ({ ...option, value: option.value || "written" }))}
        value={key || "written"}
        onChange={(chosen) => {
          setKey(chosen === "written" ? "" : chosen);
          // Saved at once, after the hidden field takes the new key.
          setTimeout(() => form.current?.requestSubmit(), 0);
        }}
      />
    </form>
  );
}

/**
 * The set's lineup (R-05.3): one line per musician, their instruments chosen from a menu, so a
 * band of a dozen still fits the panel; with more than 8 musicians, a filter by name (T-2407).
 */
export function LineupForm({
  setId,
  members,
  instruments,
  words,
}: {
  setId: string;
  /** Each musician, with the name of their instruments' menu ("Instruments for Ana"). */
  members: { id: string; name: string; plays: string[]; menu: string }[];
  instruments: { id: string; name: string }[];
  words: { save: string; filter: string; none: string };
}) {
  const [lineup, setLineup] = useState(
    Object.fromEntries(members.map((member) => [member.id, member.plays])),
  );
  const [filter, setFilter] = useState("");
  const shown = members.filter((member) =>
    member.name.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()),
  );
  const options = instruments.map((instrument) => ({
    value: instrument.id,
    label: instrument.name,
  }));
  return (
    <form action={saveLineup}>
      <input type="hidden" name="setId" value={setId} />
      {/* Every musician is saved, including those the filter hides. */}
      {members.map((member) => (
        <Fragment key={member.id}>
          <input type="hidden" name="member" value={member.id} />
          {(lineup[member.id] ?? []).map((id) => (
            <input key={id} type="hidden" name={`instrument-${member.id}`} value={id} />
          ))}
        </Fragment>
      ))}
      <VStack gap={3}>
        {members.length > 8 && (
          <TextInput label={words.filter} value={filter} onChange={setFilter} size="sm" />
        )}
        <List hasDividers density="compact">
          {shown.map((member) => (
            <Item
              key={member.id}
              as="li"
              label={member.name}
              endContent={
                <MultiSelector
                  label={member.menu}
                  isLabelHidden
                  options={options}
                  value={lineup[member.id] ?? []}
                  onChange={(value) => setLineup((current) => ({ ...current, [member.id]: value }))}
                  triggerDisplay="labels"
                  placeholder={words.none}
                  hasSearch={options.length > 15}
                  size="sm"
                  width={180}
                />
              }
            />
          ))}
        </List>
        <HStack>
          <Button type="submit" variant="primary" label={words.save} />
        </HStack>
      </VStack>
    </form>
  );
}

/** The set's temporary music director and until when (R-05.5). */
export function TempMdForm({
  setId,
  musicians,
  current,
  until: startUntil,
  words,
}: {
  setId: string;
  musicians: { value: string; label: string }[];
  current: string | null;
  until: string | null;
  words: { who: string; choose: string; until: string; hint: string; submit: string };
}) {
  const [member, setMember] = useState(current ?? "");
  const [until, setUntil] = useState<string | undefined>(startUntil ?? undefined);
  return (
    <form action={appointTempMd}>
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="until" value={until ?? ""} />
      <VStack gap={3}>
        <Selector
          label={words.who}
          htmlName="memberId"
          options={musicians}
          value={member}
          onChange={setMember}
          placeholder={words.choose}
        />
        <DateInput
          label={words.until}
          {...(until ? { value: until as ISODateString } : {})}
          onChange={setUntil}
          format="system_date"
        />
        <Text type="supporting">{words.hint}</Text>
        <HStack>
          <Button type="submit" label={words.submit} isDisabled={!member} />
        </HStack>
      </VStack>
    </form>
  );
}

/** Deleting a set, once the MD confirms it (R-05.6). */
export function DeleteSetForm({
  setId,
  bandId,
  words,
}: {
  setId: string;
  bandId: string;
  words: { confirm: string; submit: string };
}) {
  const [sure, setSure] = useState(false);
  return (
    <form action={deleteSet}>
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="bandId" value={bandId} />
      {sure && <input type="hidden" name="confirm" value="yes" />}
      <VStack gap={3}>
        <CheckboxInput label={words.confirm} value={sure} onChange={setSure} />
        <HStack>
          <Button type="submit" variant="destructive" label={words.submit} isDisabled={!sure} />
        </HStack>
      </VStack>
    </form>
  );
}
