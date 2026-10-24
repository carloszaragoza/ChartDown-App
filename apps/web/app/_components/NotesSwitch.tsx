"use client";

import { Switch } from "@astryxdesign/core/Switch";
import { useTranslations } from "next-intl";
import { hiddenNotes, useHiddenNotes } from "../../lib/view/notes";

/**
 * Show notes in View (R-03.12, T-2843): one switch, on by default, that hides the sections' notes
 * (the MD's and the instruments') on this device, for a reader who doesn't need them.
 */
export function NotesSwitch() {
  const t = useTranslations("stand");
  const isHidden = useHiddenNotes();
  return (
    <Switch
      label={t("showNotes")}
      description={t("showNotesHelp")}
      value={!isHidden}
      onChange={(shown) => hiddenNotes.set(!shown)}
    />
  );
}
