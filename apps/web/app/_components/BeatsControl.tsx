"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { BEATS_MODES, readBeatsMode, type BeatsMode } from "@chartdown/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  words: {
    label: string;
    name: string;
    off: string;
    auto: string;
    always: string;
    /** An info button that shows one line on what each mode shows (T-2807). */
    help?: { about: string; text: string };
  };
}) {
  const router = useRouter();
  const [isHelpShown, setHelpShown] = useState(false);
  const labels: Record<BeatsMode, string> = {
    off: words.off,
    auto: words.auto,
    always: words.always,
  };
  // Its name above it, as every choice in View options (T-2807), with the help beside the name.
  return (
    <VStack gap={1}>
      <BeatsMemory current={value} onChoose={onChoose} />
      <HStack gap={1} vAlign="center">
        <Text type="label" aria-hidden="true">
          {words.label}
        </Text>
        {words.help && (
          <Button
            label={words.help.about}
            tooltip={words.help.about}
            variant="ghost"
            size="sm"
            icon={<Icon icon={InformationCircleIcon} />}
            isIconOnly
            aria-expanded={isHelpShown}
            onClick={() => setHelpShown(!isHelpShown)}
          />
        )}
      </HStack>
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
      {words.help && isHelpShown && <Text type="supporting">{words.help.text}</Text>}
    </VStack>
  );
}
