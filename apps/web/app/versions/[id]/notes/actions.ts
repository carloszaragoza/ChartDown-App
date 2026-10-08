"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { readNoteForm } from "../../../../lib/versions/notes";
import { UUID } from "../load";

const back = (versionId: string, bandId: string, extra: string, form?: FormData) => {
  // Back to the section the person was working on (T-707).
  const section = Number(form?.get("section"));
  const at = Number.isInteger(section) && section >= 0 ? `&section=${section}` : "";
  return `/versions/${versionId}/notes?band=${bandId}${at}&${extra}`;
};

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
    redirect(
      back(versionId, bandId, `error=${checked.error}${editing ? `&edit=${editing}` : ""}`, form),
    );
  const supabase = await createClient();
  const { input } = checked;
  const { data: saved, error } = await supabase.rpc("save_layer_note", {
    band_id: bandId,
    version_id: versionId,
    note_id: editing,
    section: input.section,
    occurrence: input.occurrence,
    bar: input.bar,
    note_text: input.text,
    instrument_ids: input.instrumentIds,
    passes: input.passes,
  });
  if (error)
    redirect(back(versionId, bandId, `error=unknown${editing ? `&edit=${editing}` : ""}`, form));
  // The page opens on the section where the note now is (T-707).
  redirect(back(versionId, bandId, `saved=1&note=${String(saved)}`));
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
  redirect(back(versionId, bandId, error || count !== 1 ? "error=unknown" : "deleted=1", form));
}

/**
 * Hides or shows the version author's notes for the band (decision 9.3, R-06.6). The setting
 * lives on the band's layer, created here if the band has none yet.
 */
export async function setAuthorNotes(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  const bandId = String(form.get("bandId") ?? "");
  const hide = form.get("hide") === "1";
  if (!UUID.test(versionId) || !UUID.test(bandId)) redirect("/");
  const supabase = await createClient();
  const { data: layer } = await supabase
    .from("layers")
    .select("id")
    .eq("band_id", bandId)
    .eq("version_id", versionId)
    .maybeSingle();
  const { error } = layer
    ? await supabase
        .from("layers")
        .update({ hide_author_notes: hide, updated_at: new Date().toISOString() })
        .eq("id", layer.id)
    : await supabase
        .from("layers")
        .insert({ band_id: bandId, version_id: versionId, hide_author_notes: hide });
  redirect(back(versionId, bandId, error ? "error=unknown" : hide ? "hidden=1" : "shown=1", form));
}
