"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { VStack } from "@astryxdesign/core/VStack";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { useTranslations } from "next-intl";
import { useContext } from "react";
import { ShellHiddenContext } from "./shellContext";

/**
 * What a page shows the moment it is tapped, while it loads (F-003, Design Handoff principle 7):
 * skeletons in the shape of the page, never a word alone: in the app shell a title, a line and a
 * few cards; on a page that fills the screen (the landing, the offline reader) its top bar, a
 * headline and a row of bars. Stand mode has its own. The word is for screen readers only.
 */
export function PageSkeleton() {
  const t = useTranslations("nav");
  const hidden = useContext(ShellHiddenContext);
  const status = (
    <div role="status">
      <VisuallyHidden>{t("loading")}</VisuallyHidden>
    </div>
  );
  if (hidden)
    return (
      <Layout padding={8}>
        <LayoutContent>
          {status}
          <VStack gap={6} aria-hidden="true">
            <HStack gap={4} vAlign="center" hAlign="between">
              <Skeleton width={180} height={36} index={0} />
              <Skeleton width={260} height={44} radius="rounded" index={1} />
            </HStack>
            <Skeleton width="70%" height={72} index={2} />
            <Skeleton width="50%" height={24} index={3} />
            <Skeleton height={160} index={4} />
          </VStack>
        </LayoutContent>
      </Layout>
    );
  return (
    <Layout padding={8}>
      <LayoutContent>
        {status}
        <VStack gap={4} aria-hidden="true">
          <Skeleton width="40%" height={36} index={0} />
          <Skeleton width="65%" height={20} index={1} />
          <VStack gap={3}>
            <Skeleton height={120} index={2} />
            <Skeleton height={120} index={3} />
            <Skeleton height={120} index={4} />
          </VStack>
        </VStack>
      </LayoutContent>
    </Layout>
  );
}
