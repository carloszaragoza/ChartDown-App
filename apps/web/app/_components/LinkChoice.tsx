"use client";

import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { useRouter } from "next/navigation";

/**
 * A choice that lives in the address (numbers or letters, view as): a segmented control whose
 * options are addresses; choosing one opens it.
 */
export function LinkChoice({
  label,
  current,
  options,
}: {
  label: string;
  current: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <SegmentedControl
      label={label}
      value={current}
      onChange={(value) => {
        const option = options.find((item) => item.value === value);
        if (option) router.push(option.href);
      }}
    >
      {options.map((option) => (
        <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
      ))}
    </SegmentedControl>
  );
}
