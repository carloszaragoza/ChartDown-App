"use client";

import type { KeyboardEvent } from "react";

/**
 * A value of the song's details written in place, in the same text (R-13.2): a tap or a click
 * edits it, Enter or leaving keeps it, Esc puts it back; an empty one shows its name.
 */
export function InlineText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const keys = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.currentTarget.textContent = value;
      event.currentTarget.blur();
    }
  };
  return (
    <span
      // A new value remounts it, since typing replaced the text React put there.
      key={value}
      className="cd-inline-edit"
      role="textbox"
      aria-label={label}
      data-placeholder={label}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={keys}
      onBlur={(event) => {
        const next = (event.currentTarget.textContent ?? "").trim();
        if (next !== value) onChange(next);
      }}
    >
      {value}
    </span>
  );
}
