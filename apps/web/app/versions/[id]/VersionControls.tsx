"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import type { Key } from "chartdown";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToSet } from "../../sets/actions";
import { reportVersion } from "./actions";
import { openAddAudio } from "./BandAudio";

/**
 * Numbers or letters, and the key (R-03.2). Nothing is saved: the page draws the choice in place
 * and keeps it in the address (F-011).
 */
export function DisplayControls({
  style,
  onStyle,
  keys,
  shown,
  onKey,
  words,
}: {
  style: "numbers" | "letters";
  onStyle: (style: "numbers" | "letters") => void;
  /** Every key to show. */
  keys: { value: string; label: string; key: Key }[];
  shown: string;
  onKey: (key: Key) => void;
  words: { label: string; style: string; numbers: string; letters: string; key: string };
}) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap" role="group" aria-label={words.label}>
      <SegmentedControl
        label={words.style}
        value={style}
        onChange={(value) => onStyle(value === "letters" ? "letters" : "numbers")}
      >
        <SegmentedControlItem value="numbers" label={words.numbers} />
        <SegmentedControlItem value="letters" label={words.letters} />
      </SegmentedControl>
      {/* The key says what it is in its own text ("Key G (written)"), on the same line. */}
      <Selector
        label={words.key}
        isLabelHidden
        options={keys.map(({ value, label }) => ({ value, label: `${words.key} ${label}` }))}
        value={shown}
        onChange={(value) => {
          const key = keys.find((item) => item.value === value);
          if (key) onKey(key.key);
        }}
      />
    </HStack>
  );
}

/** Adds the version to one of the MD's sets (R-05.2). */
export function AddToSet({
  versionId,
  choices,
  words,
}: {
  versionId: string;
  choices: { value: string; label: string }[];
  words: { label: string; placeholder: string; submit: string };
}) {
  const [set, setSet] = useState("");
  return (
    <form action={addToSet}>
      <input type="hidden" name="versionId" value={versionId} />
      <HStack gap={2} vAlign="end">
        <Selector
          label={words.label}
          htmlName="setId"
          options={choices}
          value={set}
          onChange={setSet}
          placeholder={words.placeholder}
        />
        <Button type="submit" label={words.submit} isDisabled={!set} />
      </HStack>
    </form>
  );
}

/** An entry in a version's "…" menu: a page to go to, the band's audio dialog, or a divider. */
export type VersionMenuItem =
  { label: string; href: string } | { label: string; opens: "bandAudio" } | { type: "divider" };

/**
 * Secondary actions on a version (T-2806): a new version of the song, the report form, and for
 * those who may, Make private and adding the band's audio.
 */
export function VersionMenu({ label, items }: { label: string; items: VersionMenuItem[] }) {
  const router = useRouter();
  return (
    <MoreMenu
      label={label}
      size="lg"
      alignment="end"
      items={items.map((item) =>
        "type" in item
          ? item
          : {
              label: item.label,
              onClick: () => ("href" in item ? router.push(item.href) : openAddAudio()),
            },
      )}
    />
  );
}

/** Why a version should be looked at, and an optional note (R-07.2). */
export function ReportForm({
  versionId,
  words,
}: {
  versionId: string;
  words: {
    title: string;
    reason: string;
    lyrics: string;
    other: string;
    note: string;
    submit: string;
  };
}) {
  const [reason, setReason] = useState("lyrics");
  const [note, setNote] = useState("");
  return (
    <Card>
      <form action={reportVersion} id="report">
        <input type="hidden" name="versionId" value={versionId} />
        <VStack gap={4}>
          <Heading level={2}>{words.title}</Heading>
          <RadioList label={words.reason} htmlName="reason" value={reason} onChange={setReason}>
            <RadioListItem value="lyrics" label={words.lyrics} />
            <RadioListItem value="other" label={words.other} />
          </RadioList>
          <TextArea
            label={words.note}
            htmlName="note"
            value={note}
            onChange={setNote}
            maxLength={500}
            rows={3}
          />
          <HStack>
            <Button type="submit" variant="primary" label={words.submit} />
          </HStack>
        </VStack>
      </form>
    </Card>
  );
}
