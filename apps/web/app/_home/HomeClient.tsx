"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { useEffect, useState, useSyncExternalStore } from "react";
import { storedSet } from "../../lib/offline/store";

const noChange = () => () => undefined;

/**
 * "Good morning / afternoon / evening, Ana": the hour is the person's own, so it is read on this
 * device; until then it says "Hello".
 */
export function Greeting({
  words,
}: {
  words: { hello: string; morning: string; afternoon: string; evening: string };
}) {
  // The hour on this device; on the server there is none yet, so it says "Hello".
  const hour = useSyncExternalStore(
    noChange,
    () => new Date().getHours(),
    () => null,
  );
  const text =
    hour === null
      ? words.hello
      : hour < 12
        ? words.morning
        : hour < 18
          ? words.afternoon
          : words.evening;
  return <>{text}</>;
}

/** "Offline ready" when this set is downloaded on this device (T-902). */
export function OfflineDot({ setId, label }: { setId: string; label: string }) {
  const [kept, setKept] = useState(false);
  useEffect(() => {
    let live = true;
    storedSet(setId).then((bundle) => {
      if (live) setKept(Boolean(bundle));
    });
    return () => {
      live = false;
    };
  }, [setId]);
  if (!kept) return null;
  return (
    <HStack gap={1} vAlign="center">
      <StatusDot variant="success" label={label} />
      <Text type="supporting">{label}</Text>
    </HStack>
  );
}
