"use client";

import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Grid } from "@astryxdesign/core/Grid";
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

/** Who plays what in this set (R-05.3): each member's instruments, by default their own. */
export function LineupForm({
  setId,
  members,
  instruments,
  save,
}: {
  setId: string;
  members: { id: string; name: string; plays: string[] }[];
  instruments: { id: string; name: string }[];
  save: string;
}) {
  const [lineup, setLineup] = useState(
    Object.fromEntries(members.map((member) => [member.id, member.plays])),
  );
  const toggle = (memberId: string, instrumentId: string, on: boolean) =>
    setLineup((current) => ({
      ...current,
      [memberId]: on
        ? [...(current[memberId] ?? []), instrumentId]
        : (current[memberId] ?? []).filter((id) => id !== instrumentId),
    }));
  return (
    <form action={saveLineup}>
      <input type="hidden" name="setId" value={setId} />
      {members.map((member) => (
        <Fragment key={member.id}>
          <input type="hidden" name="member" value={member.id} />
          {(lineup[member.id] ?? []).map((id) => (
            <input key={id} type="hidden" name={`instrument-${member.id}`} value={id} />
          ))}
        </Fragment>
      ))}
      <VStack gap={4}>
        {members.map((member) => (
          <VStack key={member.id} gap={1}>
            <Text weight="semibold" id={`lineup-${member.id}`}>
              {member.name}
            </Text>
            <div role="group" aria-labelledby={`lineup-${member.id}`}>
              <Grid columns={{ minWidth: 120 }} gap={0.5}>
                {instruments.map((instrument) => (
                  <CheckboxInput
                    key={instrument.id}
                    label={instrument.name}
                    size="sm"
                    value={(lineup[member.id] ?? []).includes(instrument.id)}
                    onChange={(on) => toggle(member.id, instrument.id, on)}
                  />
                ))}
              </Grid>
            </div>
          </VStack>
        ))}
        <HStack>
          <Button type="submit" variant="primary" label={save} />
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
