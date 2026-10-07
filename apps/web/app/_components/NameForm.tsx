"use client";

import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";

/**
 * A one-field form (a band's name, an invitation's email): the button waits for something new to
 * be written. It posts to a server action, which checks it again.
 */
export function NameForm({
  action,
  label,
  submit,
  description,
  defaultValue = "",
  hidden = {},
  variant = "primary",
  htmlName = "name",
  type = "text",
}: {
  action: (form: FormData) => Promise<void>;
  label: string;
  submit: string;
  description?: string;
  defaultValue?: string;
  /** Other values the action needs. */
  hidden?: Record<string, string>;
  variant?: "primary" | "secondary";
  /** The field's name in the form; "name" by default. */
  htmlName?: string;
  type?: "text" | "email";
}) {
  const [name, setName] = useState(defaultValue);
  const ready = name.trim().length > 0 && name.trim() !== defaultValue.trim();
  return (
    <form action={action}>
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <VStack gap={3}>
        <TextInput
          label={label}
          htmlName={htmlName}
          type={type}
          value={name}
          onChange={setName}
          width="100%"
          {...(description ? { description } : {})}
        />
        <Button type="submit" variant={variant} label={submit} isDisabled={!ready} />
      </VStack>
    </form>
  );
}
