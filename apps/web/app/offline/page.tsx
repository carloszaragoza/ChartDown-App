import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { getTranslations } from "next-intl/server";

/**
 * Shown by the service worker when a page cannot be reached (T-901; Design Handoff 2.0, the
 * screens table: Offline page): there is no connection, and the downloaded sets still open.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main>
      <Layout
        height="auto"
        padding={8}
        contentWidth={640}
        content={
          <LayoutContent>
            <EmptyState
              headingLevel={1}
              title={t("title")}
              description={t("body")}
              actions={
                // Plain links on purpose: the start page loads again from the network once the
                // connection is back, and the downloaded sets open from this device.
                <HStack gap={2}>
                  <Button label={t("retry")} variant="primary" href="/" />
                  <Button label={t("downloadedSets")} href="/offline/set" />
                </HStack>
              }
            />
          </LayoutContent>
        }
      />
    </main>
  );
}
