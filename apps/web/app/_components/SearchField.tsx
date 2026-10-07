"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export interface SearchFieldProps {
  /** The page the search goes to; the text travels as `q`, with `params` beside it. */
  path: string;
  query: string;
  params?: Record<string, string>;
  label: string;
  submit: string;
  placeholder?: string;
  isLabelHidden?: boolean;
}

/** Builds a search's address: the page, the text as `q` and any other parameters. */
export function searchHref(path: string, query: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams(params);
  if (query.trim()) search.set("q", query.trim());
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * A search box with its button (Astryx TextInput). A plain GET form, so searching loads the page
 * for the new address and its results come from the server.
 */
export function SearchField({
  path,
  query,
  params,
  label,
  submit,
  placeholder,
  isLabelHidden = false,
}: SearchFieldProps) {
  const [text, setText] = useState(query);
  return (
    <form role="search" action={path} method="get">
      {Object.entries(params ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <HStack gap={2} vAlign="end">
        <StackItem size="fill">
          <TextInput
            label={label}
            isLabelHidden={isLabelHidden}
            htmlName="q"
            value={text}
            onChange={setText}
            startIcon={MagnifyingGlassIcon}
            width="100%"
            {...(placeholder ? { placeholder } : {})}
          />
        </StackItem>
        {/* Enter searches; the button is for those who prefer it. */}
        <Button type="submit" label={submit} />
      </HStack>
    </form>
  );
}
