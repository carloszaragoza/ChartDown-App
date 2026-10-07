"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { useTranslations } from "next-intl";
import { repeats } from "../../lib/chart/repeats";

export interface SongFormItem {
  abbreviation: string;
  /** What a screen reader says for it: the section's name and length. */
  description: string;
  href: string;
  /** Notes for this person in it (stand mode in a set). */
  hasNotes?: boolean;
}

/**
 * A song's form: one button per section, each a link to it (Design Handoff 2.0, 1.5 and screen
 * 03). The current one is filled, never only underlined; a section played more than once says
 * which time it is (B1, B1², B1³). Stand mode uses the large size, 56 px on touch.
 */
export function SongForm({
  label,
  items,
  current = -1,
  size = "md",
  notesLabel,
}: {
  label: string;
  items: SongFormItem[];
  current?: number;
  size?: "md" | "lg";
  notesLabel?: string;
}) {
  const c = useTranslations("chart");
  const times = repeats(items.map((item) => item.abbreviation));
  return (
    <nav aria-label={label}>
      <HStack gap={2} wrap="wrap">
        {items.map((item, index) => {
          const { time, of } = times[index] ?? { time: 1, of: 1 };
          const isCurrent = index === current;
          return (
            <Button
              key={index}
              href={item.href}
              size={size}
              variant={isCurrent ? "primary" : size === "lg" ? "secondary" : "ghost"}
              label={[item.description, of > 1 ? c("nthTime", { time }) : ""]
                .filter(Boolean)
                .join(", ")}
              {...(isCurrent ? { "aria-current": "true" as const } : {})}
              {...(item.hasNotes && notesLabel
                ? { endContent: <StatusDot variant="error" label={notesLabel} /> }
                : {})}
            >
              <span aria-hidden="true">
                {item.abbreviation}
                {of > 1 && time > 1 && <sup>{time}</sup>}
              </span>
            </Button>
          );
        })}
      </HStack>
    </nav>
  );
}
