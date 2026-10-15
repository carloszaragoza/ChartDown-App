"use client";

import { useRouter } from "next/navigation";
import { ChoiceControl } from "./ChoiceControl";

/**
 * A choice that lives in the address (numbers or letters, view as): a segmented control whose
 * options are addresses; choosing one opens it.
 */
export function LinkChoice({
  label,
  current,
  options,
  phone = false,
}: {
  label: string;
  current: string;
  options: { value: string; label: string; href: string }[];
  /** The server's guess that the page opens on a phone (R-03.9). */
  phone?: boolean;
}) {
  const router = useRouter();
  return (
    <ChoiceControl
      label={label}
      value={current}
      options={options}
      phone={phone}
      onChange={(value) => {
        const option = options.find((item) => item.value === value);
        if (option) router.push(option.href);
      }}
    />
  );
}
