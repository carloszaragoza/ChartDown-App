"use client";

import { Switch } from "@astryxdesign/core/Switch";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ChoiceControl } from "../../../_components/ChoiceControl";
import { setAuthorNotes } from "./actions";

/** "Hide the author's notes" for the band (R-06.6): switching it saves at once. */
export function HideAuthorSwitch({
  versionId,
  bandId,
  section,
  hidden,
  label,
}: {
  versionId: string;
  bandId: string;
  section: number;
  hidden: boolean;
  label: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const next = useRef<HTMLInputElement>(null);
  return (
    <form action={setAuthorNotes} ref={form}>
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="bandId" value={bandId} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="hide" ref={next} defaultValue={hidden ? "0" : "1"} />
      <Switch
        label={label}
        value={hidden}
        onChange={(on) => {
          if (next.current) next.current.value = on ? "1" : "0";
          form.current?.requestSubmit();
        }}
      />
    </form>
  );
}

/** Which band's notes, when the person directs more than one (R-04.7). */
export function BandChoice({
  label,
  bands,
  current,
}: {
  label: string;
  bands: { id: string; name: string; href: string }[];
  current: string;
}) {
  const router = useRouter();
  return (
    <ChoiceControl
      label={label}
      value={current}
      options={bands.map((band) => ({ value: band.id, label: band.name }))}
      onChange={(id) => {
        const band = bands.find((item) => item.id === id);
        if (band) router.push(band.href);
      }}
    />
  );
}
