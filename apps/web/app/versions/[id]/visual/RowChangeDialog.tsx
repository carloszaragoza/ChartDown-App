"use client";

import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { RowChange } from "../../../../lib/visual/edit";
import { CHANGE_METERS, MAJOR_KEYS, MINOR_KEYS } from "../../../../lib/visual/model";

const NONE = "none";

/**
 * Change key, meter or tempo here (R-13.10): from the bar on, each optional. It opens with the
 * change the bar already starts; the dialog is new for each bar (its key).
 */
export function RowChangeDialog({
  open,
  bar,
  initial,
  onClose,
  onApply,
}: {
  open: boolean;
  /** The bar, in words ("Verse 1, bar 3"). */
  bar: string;
  initial: RowChange;
  onClose: () => void;
  onApply: (change: RowChange) => void;
}) {
  const t = useTranslations("visual");
  const [key, setKey] = useState(initial.key || NONE);
  const [meter, setMeter] = useState(initial.meter || NONE);
  const [tempo, setTempo] = useState(initial.tempo);
  const none = { value: NONE, label: t("rowChange.none") };
  return (
    <Dialog
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      padding={4}
      purpose="form"
    >
      <VStack gap={4}>
        <Heading level={2}>{t("rowChange.title", { bar })}</Heading>
        <Text type="supporting">{t("rowChange.intro")}</Text>
        <HStack gap={3} wrap="wrap">
          <Selector
            label={t("field.key")}
            options={[
              none,
              ...[...MAJOR_KEYS, ...MINOR_KEYS].map((name) => ({ value: name, label: name })),
            ]}
            value={key}
            onChange={setKey}
          />
          <Selector
            label={t("field.meter")}
            options={[none, ...CHANGE_METERS.map((name) => ({ value: name, label: name }))]}
            value={meter}
            onChange={setMeter}
          />
          <NumberInput
            label={t("field.tempo")}
            value={tempo ? parseFloat(tempo) || null : null}
            min={20}
            max={320}
            onChange={(value) => setTempo(value ? String(Math.round(value)) : "")}
          />
        </HStack>
        <HStack gap={2} hAlign="end">
          <Button label={t("cancel")} variant="ghost" onClick={onClose} />
          <Button
            label={t("rowChange.apply")}
            variant="primary"
            onClick={() =>
              onApply({
                key: key === NONE ? "" : key,
                meter: meter === NONE ? "" : meter,
                tempo,
              })
            }
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
