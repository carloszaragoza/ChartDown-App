"use client";

import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { VStack } from "@astryxdesign/core/VStack";
import { useRouter } from "next/navigation";
import { SearchField, searchHref } from "../_components/SearchField";

export interface CatalogSearchProps {
  query: string;
  source: string | null;
  /** The source filter's options, "all" first. */
  sources: { value: string; label: string }[];
  words: { search: string; placeholder: string; submit: string; sources: string };
}

/**
 * The catalog's search and source filter (Design Handoff 2.0 screen 04). The results stay on the
 * server: searching or choosing a source changes the address, which the page reads (R-02.10).
 */
export function CatalogSearch({ query, source, sources, words }: CatalogSearchProps) {
  const router = useRouter();
  return (
    <VStack gap={3}>
      <SearchField
        path="/catalog"
        query={query}
        params={source ? { source } : {}}
        label={words.search}
        isLabelHidden
        placeholder={words.placeholder}
        submit={words.submit}
      />
      <SegmentedControl
        label={words.sources}
        value={source ?? "all"}
        onChange={(value) =>
          router.push(searchHref("/catalog", query, value === "all" ? {} : { source: value }))
        }
      >
        {sources.map((option) => (
          <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
        ))}
      </SegmentedControl>
    </VStack>
  );
}
