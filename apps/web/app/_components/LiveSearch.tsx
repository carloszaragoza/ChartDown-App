"use client";

import { TextInput } from "@astryxdesign/core/TextInput";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchHref } from "./SearchField";

/**
 * A search that filters as the person types (owner's review, November 1, 2026). The text travels
 * as `q`, so the page still reads it on the server. There is no Search button.
 */
export function LiveSearch({
  path,
  query,
  params,
  label,
  placeholder,
  isLabelHidden = true,
}: {
  path: string;
  query: string;
  params?: Record<string, string>;
  label: string;
  placeholder?: string;
  isLabelHidden?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const focused = useRef(false);
  // A late result must not wipe a letter the person just typed. Back and reload still fill it.
  useEffect(() => {
    if (!focused.current) setText(query);
  }, [query]);
  return (
    <TextInput
      label={label}
      isLabelHidden={isLabelHidden}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
      }}
      onChange={(value) => {
        setText(value);
        router.replace(searchHref(path, value, params), { scroll: false });
      }}
      startIcon={MagnifyingGlassIcon}
      {...(placeholder ? { placeholder } : {})}
    />
  );
}
