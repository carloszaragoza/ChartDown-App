"use client";

import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { Grid } from "@astryxdesign/core/Grid";
import { useState } from "react";
import { AddIcon, CopyIcon } from "../_components/ActionIcons";

/** A field of an admin form (Astryx TextInput): it starts with `initial` and submits as `name`. */
export function AdminField({
  label,
  name,
  initial = "",
  hint,
  placeholder,
  required = false,
  optional = false,
  readOnly = false,
}: {
  label: string;
  name: string;
  initial?: string | undefined;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <TextInput
      label={label}
      htmlName={name}
      value={value}
      onChange={setValue}
      width="100%"
      isRequired={required}
      isOptional={optional}
      isReadOnly={readOnly}
      {...(hint ? { description: hint } : {})}
      {...(placeholder ? { placeholder } : {})}
    />
  );
}

/**
 * Creating an invite code (Design Handoff 2.0 screen 13, R-01.7): the kind, the uses (locked to 1
 * for a single-use code) and who it is for. The server reads the form again (`readInvite`).
 */
export function InviteForm({
  action,
  words,
}: {
  action: (form: FormData) => Promise<void>;
  words: {
    title: string;
    kind: string;
    single: string;
    band: string;
    uses: string;
    usesSingle: string;
    usesBand: string;
    note: string;
    notePlaceholder: string;
    submit: string;
  };
}) {
  const [kind, setKind] = useState("single_use");
  const [uses, setUses] = useState("");
  const single = kind === "single_use";
  return (
    <form action={action} aria-label={words.title}>
      <VStack gap={4}>
        <Grid columns={{ minWidth: 200 }} gap={4}>
          <Selector
            label={words.kind}
            htmlName="kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "single_use", label: words.single },
              { value: "band", label: words.band },
            ]}
          />
          <TextInput
            label={words.uses}
            htmlName="max_uses"
            value={single ? "1" : uses}
            onChange={setUses}
            isDisabled={single}
            description={single ? words.usesSingle : words.usesBand}
            width="100%"
          />
          <AdminField label={words.note} name="note" placeholder={words.notePlaceholder} optional />
        </Grid>
        <HStack>
          <Button type="submit" variant="primary" label={words.submit} icon={<AddIcon />} />
        </HStack>
      </VStack>
    </form>
  );
}

/** Copies an invite code to the clipboard; the button's label says it was copied. */
export function CopyCode({ code, copy, copied }: { code: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      label={done ? copied : copy}
      tooltip={done ? copied : copy}
      icon={<CopyIcon />}
      isIconOnly
      variant="ghost"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => setDone(true));
      }}
    />
  );
}
