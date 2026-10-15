"use client";

import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { usePhone } from "../../lib/shell/phone";

// On a phone a segmented choice holds three short options at most (design handoff 5).
const MAX_OPTIONS = 3;
const MAX_LABEL = 12;

/** Whether a choice would be cut short on a phone, so it becomes a menu there (R-03.9). */
export function needsMenu(options: readonly { label: string }[]): boolean {
  return options.length > MAX_OPTIONS || options.some((option) => option.label.length > MAX_LABEL);
}

/**
 * One choice among a few options: a segmented control, or on a phone, when its options would be
 * cut short ("Ba…"), a menu with the same options and label (R-03.9).
 */
export function ChoiceControl({
  label,
  value,
  options,
  onChange,
  phone = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  /** The server's guess that the page opens on a phone. */
  phone?: boolean;
}) {
  const isPhone = usePhone(phone);
  if (isPhone && needsMenu(options))
    return (
      <Selector label={label} options={options} value={value} onChange={onChange} width="100%" />
    );
  return (
    <SegmentedControl label={label} value={value} onChange={onChange}>
      {options.map((option) => (
        <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
      ))}
    </SegmentedControl>
  );
}
