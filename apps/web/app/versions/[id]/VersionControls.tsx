"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { Key } from "chartdown";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { addToSet, undoAddToSet } from "../../sets/actions";
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
  /** Every key to show, each with its whole label. */
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
      {/* The key says what it is in its own text ("Key E · original"), on the same line. */}
      <Selector
        label={words.key}
        isLabelHidden
        options={keys.map(({ value, label }) => ({ value, label }))}
        value={shown}
        onChange={(value) => {
          const key = keys.find((item) => item.value === value);
          if (key) onKey(key.key);
        }}
      />
    </HStack>
  );
}

/**
 * Add to set as one menu button (R-05.2, T-2807): choosing a set adds the song at once and a toast
 * says so, with Undo; the last items start a new set in the MD's bands.
 */
export function AddToSet({
  versionId,
  choices,
  newSets,
}: {
  versionId: string;
  choices: { value: string; label: string; name: string }[];
  /** Where each of the MD's bands starts a new set. */
  newSets: { label: string; href: string }[];
}) {
  const t = useTranslations("sets");
  const router = useRouter();
  const toast = useToast();
  const add = async (choice: { value: string; name: string }) => {
    const item = await addToSet(choice.value, versionId);
    if (!item) return void toast({ body: t("addFailed"), type: "error" });
    // The answer to Undo takes the same toast's place.
    const uniqueID = `added-${item}`;
    toast({
      body: t("added", { set: choice.name }),
      uniqueID,
      autoHideDuration: 8000,
      endContent: (
        <Button
          label={t("undo")}
          variant="ghost"
          size="sm"
          onClick={() =>
            void undoAddToSet(item).then((done) =>
              toast(
                done
                  ? { body: t("undone", { set: choice.name }), uniqueID }
                  : { body: t("addFailed"), type: "error", uniqueID },
              ),
            )
          }
        />
      ),
    });
  };
  return (
    <DropdownMenu
      button={{ label: t("addTo"), icon: <Icon icon={PlusIcon} /> }}
      alignment="end"
      presentation="adaptive"
      items={[
        ...choices.map((choice) => ({ label: choice.label, onClick: () => void add(choice) })),
        ...(newSets.length > 0 ? [{ type: "divider" as const }] : []),
        ...newSets.map((item) => ({ label: item.label, onClick: () => router.push(item.href) })),
      ]}
    />
  );
}

/** An entry in a version's "…" menu: a page to go to, the band's audio dialog, or a divider. */
export type VersionMenuItem =
  { label: string; href: string } | { label: string; opens: "bandAudio" } | { type: "divider" };

/**
 * Secondary actions on a version (T-2806): a new version of the song, the report form, and for
 * those who may, Make private and adding the band's audio.
 */
export function VersionMenu({
  label,
  items,
  size = "lg",
}: {
  label: string;
  items: VersionMenuItem[];
  size?: "md" | "lg";
}) {
  const router = useRouter();
  return (
    <MoreMenu
      label={label}
      size={size}
      alignment="end"
      // A bottom sheet on a phone: a popover at the row's start edge had no room (T-2812).
      presentation="adaptive"
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
