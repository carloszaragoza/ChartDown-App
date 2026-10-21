"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { repeats } from "../../lib/chart/repeats";

export interface SongFormItem {
  abbreviation: string;
  /** What a screen reader says for it: the section's name and length. */
  description: string;
  href: string;
  /** Notes for this person in it (stand mode in a set). */
  hasNotes?: boolean;
  /** Queued to play after the section that sounds (R-11.15). */
  isQueued?: boolean;
}

/**
 * A song's form: one button per section, each a link to it (Design Handoff 2.0, 1.5 and screen
 * 03). The current one is filled, never only underlined; a section played more than once says
 * which time it is (B1, B1², B1³). Stand mode uses the large size, 56 px on touch. On a phone it is
 * one strip that scrolls sideways inside itself, the current section kept in view (R-03.8).
 */
export function SongForm({
  label,
  items,
  current = -1,
  size = "md",
  notesLabel,
  isStrip = false,
}: {
  label: string;
  items: SongFormItem[];
  current?: number;
  size?: "md" | "lg";
  notesLabel?: string;
  isStrip?: boolean;
}) {
  const c = useTranslations("chart");
  const times = repeats(items.map((item) => item.abbreviation));
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isStrip) return;
    strip.current
      ?.querySelector("[aria-current]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [isStrip, current]);
  return (
    <nav aria-label={label} ref={strip}>
      <HStack gap={2} wrap={isStrip ? "nowrap" : "wrap"} isScrollable={isStrip}>
        {items.map((item, index) => {
          const { time, of } = times[index] ?? { time: 1, of: 1 };
          const isCurrent = index === current;
          // In a strip each section keeps its whole name and the strip scrolls; a button left
          // to the row would shrink and cut it short ("V…").
          return (
            <StackItem key={index}>
              <Button
                href={item.href}
                size={size}
                variant={isCurrent ? "primary" : size === "lg" ? "secondary" : "ghost"}
                label={[
                  item.description,
                  of > 1 ? c("nthTime", { time }) : "",
                  item.isQueued ? c("queued") : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
                {...(isCurrent ? { "aria-current": "true" as const } : {})}
                {...(item.isQueued
                  ? { endContent: <Icon icon={ChevronDoubleRightIcon} /> }
                  : item.hasNotes && notesLabel
                    ? { endContent: <StatusDot variant="error" label={notesLabel} /> }
                    : {})}
              >
                <span aria-hidden="true">
                  {item.abbreviation}
                  {of > 1 && time > 1 && <sup>{time}</sup>}
                </span>
              </Button>
            </StackItem>
          );
        })}
      </HStack>
    </nav>
  );
}
