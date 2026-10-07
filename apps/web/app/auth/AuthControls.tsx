"use client";

import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useState, type ReactNode } from "react";

/** A field of a sign-in form (Astryx TextInput): it submits with the form, as `name`. */
export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  hint?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <TextInput
      label={label}
      htmlName={name}
      type={type}
      value={value}
      onChange={setValue}
      width="100%"
      {...(autoComplete ? { autoComplete } : {})}
      {...(hint ? { description: hint } : {})}
    />
  );
}

/**
 * Accepting the Terms of Use and the Privacy Notice (T-1202): the links to read them, the box to
 * accept them, and Continue, which waits for it. The server checks the acceptance again.
 */
export function AcceptAndContinue({
  label,
  links,
  submit,
}: {
  label: string;
  links: ReactNode;
  submit: string;
}) {
  const [accepted, setAccepted] = useState(false);
  return (
    <VStack gap={3}>
      {accepted && <input type="hidden" name="terms" value="accepted" />}
      {links}
      <CheckboxInput label={label} value={accepted} onChange={setAccepted} />
      <Button type="submit" variant="primary" label={submit} isDisabled={!accepted} width="100%" />
    </VStack>
  );
}
