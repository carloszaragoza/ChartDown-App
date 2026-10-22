"use client";

import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/VStack";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { usePhone } from "../../lib/shell/phone";

/**
 * The page's settings in one place, as in stand mode (T-2807; owner's review, October 21, 2026):
 * an icon button beside the metronome that opens them from the bottom, as the metronome's own
 * options do. What it holds is the page's: Numbers / Letters, the key, Beat marks, View as. The
 * medium size beside the metronome, stand mode's 40 px on a phone (T-2833).
 */
export function ViewOptions({ children, phone = false }: { children: ReactNode; phone?: boolean }) {
  const t = useTranslations("stand");
  const isPhone = usePhone(phone);
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button
        label={t("viewOptions")}
        tooltip={t("viewOptions")}
        size={isPhone ? "lg" : "md"}
        variant="secondary"
        isIconOnly
        icon={<Icon icon={AdjustmentsHorizontalIcon} />}
        onClick={() => setOpen(true)}
      />
      <BottomSheet isOpen={isOpen} onOpenChange={setOpen} label={t("viewOptions")} height="hug">
        <VStack gap={4} padding={4}>
          <Heading level={2}>{t("viewOptions")}</Heading>
          {children}
        </VStack>
      </BottomSheet>
    </>
  );
}
