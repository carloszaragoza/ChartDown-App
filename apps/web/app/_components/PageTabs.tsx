"use client";

import { Tab, TabList } from "@astryxdesign/core/TabList";

/**
 * Tabs that live in the address (`?tab=`): each is a link, so the page shows the chosen one from
 * the server and a tab can be shared or reloaded.
 */
export function PageTabs({
  current,
  tabs,
}: {
  current: string;
  tabs: { value: string; label: string; href: string }[];
}) {
  return (
    <TabList value={current} onChange={() => undefined} hasDivider isFullBleed>
      {tabs.map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} href={tab.href} />
      ))}
    </TabList>
  );
}
