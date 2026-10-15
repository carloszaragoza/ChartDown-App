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
 * names a mode is shown as it says and does not change what the browser remembers. A page that
 * draws the mode itself (stand mode, F-005) takes it in place; any other asks the server.
 */
export function BeatsMemory({
  current,
  onChoose,
}: {
  current: BeatsMode;
  onChoose?: ((mode: BeatsMode) => void) | undefined;
}) {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("beats")) return;
    const remembered = rememberedBeats();
    if (remembered === undefined || remembered === current) return;
    if (onChoose) return onChoose(remembered);
    if (remembered === "auto") url.searchParams.delete("beats");
    else url.searchParams.set("beats", remembered);
    router.replace(`${url.pathname}${url.search}`);
    // onChoose is a new function on every render and does the same each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  onChoose,
  words,
}: {
  value: BeatsMode;
  /** The address for each mode, when the server draws it. */
  hrefs?: Record<BeatsMode, string>;
  /** Draws the chosen mode in place instead of asking the server for its address (F-005). */
  onChoose?: (mode: BeatsMode) => void;
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
      <BeatsMemory current={value} onChoose={onChoose} />
      <Text type="supporting" aria-hidden="true">
        {words.label}
      </Text>
      <SegmentedControl
        label={words.name}
        value={value}
        onChange={(mode) => {
          const chosen = readBeatsMode(mode);
          rememberBeats(chosen);
          if (onChoose) onChoose(chosen);
          else if (hrefs) router.push(hrefs[chosen]);
        }}
      >
        {BEATS_MODES.map((mode) => (
          <SegmentedControlItem key={mode} value={mode} label={labels[mode]} />
        ))}
      </SegmentedControl>
    </HStack>
  );
}
