"use client";

import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TimeInput } from "@astryxdesign/core/TimeInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";

type ISODateString = Exclude<Parameters<typeof DateInput>[0]["value"], undefined>;
type ISOTimeString = Exclude<Parameters<typeof TimeInput>[0]["value"], undefined>;

export const SET_TYPES = ["rehearsal", "service", "concert"] as const;

export interface SetFormProps {
  action: (form: FormData) => Promise<void>;
  /** Other values the action needs, like the band or the set. */
  hidden: Record<string, string>;
  initial?: { name: string; date: string | null; time: string | null; type: string | null };
  words: {
    name: string;
    date: string;
    time: string;
    type: string;
    chooseType: string;
    types: Record<(typeof SET_TYPES)[number], string>;
    submit: string;
    missing: string;
  };
}

/**
 * A set's name, date, time and type (R-05.1, R-05.6; Design Handoff 2.0 screen 10). The date and
 * time are optional; the button waits for a name and a type, and the server checks them again.
 */
export function SetForm({ action, hidden, initial, words }: SetFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState<string | undefined>(initial?.date ?? undefined);
  const [time, setTime] = useState<string | undefined>(initial?.time?.slice(0, 5) ?? undefined);
  const [type, setType] = useState(initial?.type ?? "");
  const ready = name.trim().length > 0 && type !== "";
  return (
    <form action={action}>
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <input type="hidden" name="date" value={date ?? ""} />
      <input type="hidden" name="time" value={time ?? ""} />
      <VStack gap={4}>
        <FormLayout>
          <TextInput
            label={words.name}
            htmlName="name"
            value={name}
            onChange={setName}
            isRequired
          />
          <DateInput
            label={words.date}
            {...(date ? { value: date as ISODateString } : {})}
            onChange={setDate}
            isOptional
          />
          <TimeInput
            label={words.time}
            {...(time ? { value: time as ISOTimeString } : {})}
            onChange={setTime}
            isOptional
          />
          <Selector
            label={words.type}
            htmlName="type"
            options={SET_TYPES.map((value) => ({ value, label: words.types[value] }))}
            value={type}
            onChange={setType}
            placeholder={words.chooseType}
            isRequired
          />
        </FormLayout>
        <Button
          type="submit"
          variant="primary"
          label={words.submit}
          isDisabled={!ready}
          {...(!ready ? { tooltip: words.missing } : {})}
        />
      </VStack>
    </form>
  );
}
