"use client";

import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
import { setMemberInstruments } from "../actions";

/** A member's default instruments, which the MD sets (R-04.3). */
export function InstrumentsForm({
  bandId,
  memberId,
  instruments,
  chosen: start,
  words,
}: {
  bandId: string;
  memberId: string;
  instruments: { id: string; name: string }[];
  chosen: string[];
  words: { save: string; cancel: string; cancelHref: string };
}) {
  const [chosen, setChosen] = useState(start);
  return (
    <form action={setMemberInstruments}>
      <input type="hidden" name="bandId" value={bandId} />
      <input type="hidden" name="memberId" value={memberId} />
      {chosen.map((id) => (
        <input key={id} type="hidden" name="instrument" value={id} />
      ))}
      <VStack gap={4}>
        <Grid columns={{ minWidth: 160 }} gap={1}>
          {instruments.map((instrument) => (
            <CheckboxInput
              key={instrument.id}
              label={instrument.name}
              value={chosen.includes(instrument.id)}
              onChange={(on) =>
                setChosen((current) =>
                  on ? [...current, instrument.id] : current.filter((id) => id !== instrument.id),
                )
              }
            />
          ))}
        </Grid>
        <HStack gap={2}>
          <Button type="submit" variant="primary" label={words.save} />
          <Button label={words.cancel} variant="ghost" href={words.cancelHref} />
        </HStack>
      </VStack>
    </form>
  );
}
