"use client";

import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Hold until a cue (R-13.7): asks what the chord waits for, then the editor holds the bar's last
 * chord with a fermata and writes the cue above it.
 */
export function HoldUntilDialog({
  open,
  onClose,
  onHold,
}: {
  open: boolean;
  onClose: () => void;
  onHold: (cue: string) => void;
}) {
  const t = useTranslations("visual");
  const [cue, setCue] = useState("");
  return (
    <Dialog
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      padding={4}
      purpose="form"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (cue.trim()) onHold(cue);
        }}
      >
        <VStack gap={4}>
          <Heading level={2}>{t("holdUntil.title")}</Heading>
          <TextInput
            label={t("holdUntil.cue")}
            description={t("holdUntil.hint")}
            placeholder={t("holdUntil.placeholder")}
            value={cue}
            onChange={setCue}
            hasAutoFocus
            isRequired
          />
          <HStack gap={2} hAlign="end">
            <Button label={t("cancel")} variant="ghost" onClick={onClose} />
            <Button
              label={t("holdUntil.apply")}
              variant="primary"
              type="submit"
              isDisabled={!cue.trim()}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
