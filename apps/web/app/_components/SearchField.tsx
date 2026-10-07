"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
 * A search box with its button (Astryx TextInput). The results stay on the server: searching
 * changes the address, which the page reads.
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
  const router = useRouter();
  const [text, setText] = useState(query);
  const search = (event: FormEvent) => {
    event.preventDefault();
    router.push(searchHref(path, text, params));
  };
  return (
    <form role="search" onSubmit={search}>
      <HStack gap={2} vAlign="end">
        <StackItem size="fill">
          <TextInput
            label={label}
            isLabelHidden={isLabelHidden}
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
