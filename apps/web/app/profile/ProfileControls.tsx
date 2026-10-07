"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { deleteAccount, saveNoticePrefs, saveProfile } from "./actions";

export interface InstrumentGroup {
  title: string;
  instruments: { id: string; name: string; icon: ReactNode; note?: string }[];
}

/**
 * Name, language and instruments (R-01.2, R-01.5; Design Handoff 2.0 screen 15). Save profile is
 * enabled only with unsaved changes.
 */
export function ProfileForm({
  name: startName,
  language: startLanguage,
  languages,
  groups,
  chosen: startChosen,
  words,
}: {
  name: string;
  language: string;
  languages: { value: string; label: string }[];
  groups: InstrumentGroup[];
  chosen: string[];
  words: {
    name: string;
    nameHint: string;
    language: string;
    languageHint: string;
    instruments: string;
    instrumentsHint: string;
    save: string;
    allSaved: string;
    unsaved: string;
  };
}) {
  const [name, setName] = useState(startName);
  const [language, setLanguage] = useState(startLanguage);
  const [chosen, setChosen] = useState(startChosen);
  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((item) => b.includes(item));
  const dirty =
    name.trim() !== startName.trim() || language !== startLanguage || !same(chosen, startChosen);
  return (
    <form action={saveProfile}>
      <input type="hidden" name="language" value={language} />
      {chosen.map((id) => (
        <input key={id} type="hidden" name="instrument" value={id} />
      ))}
      <VStack gap={6}>
        <TextInput
          label={words.name}
          description={words.nameHint}
          htmlName="name"
          value={name}
          onChange={setName}
          width="100%"
        />
        <VStack gap={1}>
          <Text weight="semibold">{words.language}</Text>
          <HStack>
            <SegmentedControl label={words.language} value={language} onChange={setLanguage}>
              {languages.map((option) => (
                <SegmentedControlItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                />
              ))}
            </SegmentedControl>
          </HStack>
          <Text type="supporting">{words.languageHint}</Text>
        </VStack>
        <VStack gap={3}>
          <VStack gap={1}>
            <Heading level={2}>{words.instruments}</Heading>
            <Text color="secondary">{words.instrumentsHint}</Text>
          </VStack>
          <Grid columns={{ minWidth: 200 }} gap={3}>
            {groups.map((group) => (
              <Card key={group.title}>
                <VStack gap={2}>
                  <Text color="secondary" id={`group-${group.title}`}>
                    {group.title}
                  </Text>
                  <div role="group" aria-labelledby={`group-${group.title}`}>
                    <VStack gap={1}>
                      {group.instruments.map((instrument) => (
                        <Fragment key={instrument.id}>
                          <HStack gap={2} vAlign="center">
                            <CheckboxInput
                              label={instrument.name}
                              {...(instrument.note ? { description: instrument.note } : {})}
                              value={chosen.includes(instrument.id)}
                              onChange={(on) =>
                                setChosen((current) =>
                                  on
                                    ? [...current, instrument.id]
                                    : current.filter((id) => id !== instrument.id),
                                )
                              }
                            />
                            {instrument.icon}
                          </HStack>
                        </Fragment>
                      ))}
                    </VStack>
                  </div>
                </VStack>
              </Card>
            ))}
          </Grid>
        </VStack>
        <HStack gap={3} vAlign="center">
          <Button
            type="submit"
            variant="primary"
            label={words.save}
            isDisabled={!dirty || !name.trim()}
          />
          <Text type="supporting">{dirty ? words.unsaved : words.allSaved}</Text>
        </HStack>
      </VStack>
    </form>
  );
}

/** Which notices arrive (R-09.5): each switch saves the whole choice at once. */
export function NoticeSwitches({
  groups,
  off,
}: {
  groups: { title: string; kinds: { type: string; label: string; hint?: string }[] }[];
  off: string[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [offNow, setOffNow] = useState(off);
  const all = groups.flatMap((group) => group.kinds.map((kind) => kind.type));
  return (
    <form action={saveNoticePrefs} ref={form}>
      {all
        .filter((type) => !offNow.includes(type))
        .map((type) => (
          <input key={type} type="hidden" name="notice" value={type} />
        ))}
      <VStack gap={6}>
        {groups.map((group) => (
          <VStack key={group.title} gap={2}>
            <Heading level={2}>{group.title}</Heading>
            {group.kinds.map((kind) => (
              <Switch
                key={kind.type}
                label={kind.label}
                {...(kind.hint ? { description: kind.hint } : {})}
                value={!offNow.includes(kind.type)}
                onChange={(on) => {
                  setOffNow((current) =>
                    on ? current.filter((type) => type !== kind.type) : [...current, kind.type],
                  );
                  // Saved at once, after the hidden fields take the new choice.
                  setTimeout(() => form.current?.requestSubmit(), 0);
                }}
              />
            ))}
          </VStack>
        ))}
      </VStack>
    </form>
  );
}

/** Deleting the account (R-01.6): the button waits for the person's own email. */
export function DeleteAccountForm({
  email,
  words,
}: {
  email: string;
  words: { confirm: string; submit: string };
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  return (
    <form action={deleteAccount}>
      <VStack gap={3}>
        <TextInput
          label={words.confirm}
          type="email"
          htmlName="confirm"
          value={typed}
          onChange={setTyped}
          width="100%"
          autoComplete="off"
        />
        <HStack>
          <Button type="submit" variant="destructive" label={words.submit} isDisabled={!matches} />
        </HStack>
      </VStack>
    </form>
  );
}
