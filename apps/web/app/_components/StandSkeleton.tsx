"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { VStack } from "@astryxdesign/core/VStack";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { useTranslations } from "next-intl";

/**
 * Stand mode while it loads (F-003): full screen, like stand mode itself, with the song form, the
 * title line and the section to read.
 */
export function StandSkeleton() {
  const t = useTranslations("nav");
  return (
    <div style={{ minHeight: "100dvh", padding: "var(--spacing-8)" }}>
      <div role="status">
        <VisuallyHidden>{t("loading")}</VisuallyHidden>
      </div>
      <VStack gap={4} aria-hidden="true">
        <HStack gap={2}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} width={56} height={56} radius={2} index={index} />
          ))}
        </HStack>
        <Skeleton width="45%" height={40} index={5} />
        <Skeleton height="55dvh" index={6} />
      </VStack>
    </div>
  );
}
