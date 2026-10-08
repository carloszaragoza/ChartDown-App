"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { BEATS_MODES, readBeatsMode, type BeatsMode } from "@chartdown/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const STORAGE_KEY = "chartdown:beats";

/** The mode this browser last chose, if any. Storage can be missing or blocked: never required. */
export function rememberedBeats(): BeatsMode | undefined {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? undefined : readBeatsMode(stored);
  } catch {
    return undefined;
  }
}

function rememberBeats(mode: BeatsMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Without storage the choice lives in the address alone.
  }
}

/**
 * Brings back the mode this browser last chose when the address names none (R-03.7). A link that
 * names a mode is shown as it says and does not change what the browser remembers.
 */
export function BeatsMemory({ current }: { current: BeatsMode }) {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("beats")) return;
    const remembered = rememberedBeats();
    if (remembered === undefined || remembered === current) return;
    if (remembered === "auto") url.searchParams.delete("beats");
    else url.searchParams.set("beats", remembered);
    router.replace(`${url.pathname}${url.search}`);
  }, [current, router]);
  return null;
}

/**
 * The Beats control: Off, Auto or Always (R-03.7, design/chart-viewer section 5). The choice lives
 * in the address, like numbers or letters, and the browser remembers the last one.
 */
export function BeatsControl({
  value,
  hrefs,
  words,
}: {
  value: BeatsMode;
  /** The address for each mode. */
  hrefs: Record<BeatsMode, string>;
  words: { label: string; name: string; off: string; auto: string; always: string };
}) {
  const router = useRouter();
  const labels: Record<BeatsMode, string> = {
    off: words.off,
    auto: words.auto,
    always: words.always,
  };
  return (
    <HStack gap={2} vAlign="center">
      <BeatsMemory current={value} />
      <Text type="supporting" aria-hidden="true">
        {words.label}
      </Text>
      <SegmentedControl
        label={words.name}
        value={value}
        onChange={(mode) => {
          const chosen = readBeatsMode(mode);
          rememberBeats(chosen);
          router.push(hrefs[chosen]);
        }}
      >
        {BEATS_MODES.map((mode) => (
          <SegmentedControlItem key={mode} value={mode} label={labels[mode]} />
        ))}
      </SegmentedControl>
    </HStack>
  );
}
