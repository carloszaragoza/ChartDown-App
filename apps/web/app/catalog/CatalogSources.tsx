"use client";

import { Tab, TabList } from "@astryxdesign/core/TabList";
import { useRouter } from "next/navigation";
import { ChoiceControl, needsMenu } from "../_components/ChoiceControl";
import { searchHref } from "../_components/SearchField";
import { usePhone } from "../../lib/shell/phone";

/**
 * The catalog's sources (owner's review, November 1, 2026): a line of text. On a phone, where
 * those names would be cut short, the same choice becomes a menu (R-03.9).
 */
export function CatalogSources({
  query,
  source,
  options,
  label,
  phone = false,
}: {
  query: string;
  source: string;
  options: { value: string; label: string }[];
  label: string;
  phone?: boolean;
}) {
  const router = useRouter();
  const isPhone = usePhone(phone);
  const choose = (value: string) =>
    router.push(searchHref("/catalog", query, value === "all" ? {} : { source: value }));
  if (isPhone && needsMenu(options)) {
    return <ChoiceControl label={label} value={source} options={options} onChange={choose} phone />;
  }
  return (
    <TabList value={source} hasDivider onChange={choose}>
      {options.map((option) => (
        <Tab key={option.value} value={option.value} label={option.label} />
      ))}
    </TabList>
  );
}
