"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { readNoteForm } from "../../../../lib/versions/notes";
import { UUID } from "../load";

const back = (versionId: string, bandId: string, extra: string) =>
  `/versions/${versionId}/notes?band=${bandId}&${extra}`;

/** Saves a note on the band's layer, creating the layer with its first note (R-03.5, R-06.6). */
export async function saveNote(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  const bandId = String(form.get("bandId") ?? "");
  const noteId = String(form.get("noteId") ?? "");
  if (!UUID.test(versionId) || !UUID.test(bandId)) redirect("/");
  const editing = UUID.test(noteId) ? noteId : null;

  const checked = readNoteForm(form);
  if ("error" in checked)
    redirect(back(versionId, bandId, `error=${checked.error}${editing ? `&edit=${editing}` : ""}`));
  const supabase = await createClient();
  const { input } = checked;
  const { error } = await supabase.rpc("save_layer_note", {
    band_id: bandId,
    version_id: versionId,
    note_id: editing,
    section: input.section,
    occurrence: input.occurrence,
    bar: input.bar,
    note_text: input.text,
    instrument_ids: input.instrumentIds,
  });
  if (error) redirect(back(versionId, bandId, `error=unknown${editing ? `&edit=${editing}` : ""}`));
  redirect(back(versionId, bandId, "saved=1"));
}

/** Deletes a note of the band's layer; only the band's MD may (R-03.5). */
export async function deleteNote(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  const bandId = String(form.get("bandId") ?? "");
  const noteId = String(form.get("noteId") ?? "");
  if (!UUID.test(versionId) || !UUID.test(bandId) || !UUID.test(noteId)) redirect("/");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("layer_notes")
    .delete({ count: "exact" })
    .eq("id", noteId);
  redirect(back(versionId, bandId, error || count !== 1 ? "error=unknown" : "deleted=1"));
}
