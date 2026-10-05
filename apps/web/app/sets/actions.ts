"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { UUID } from "../versions/[id]/load";

const TYPES = new Set(["rehearsal", "service", "concert"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const setPage = (setId: string, extra: string) => `/sets/${setId}?${extra}`;

async function client() {
  if (!authEnabled()) redirect("/");
  return createClient();
}

/** Name, optional date and type, as the MD wrote them (R-05.1). */
function readSet(form: FormData) {
  const name = field(form, "name");
  const date = field(form, "date");
  const type = field(form, "type");
  if (name.length < 1 || name.length > 80) return { error: "name" as const };
  if (date && !DATE.test(date)) return { error: "date" as const };
  if (!TYPES.has(type)) return { error: "type" as const };
  return { name, date: date || null, type };
}

/** The MD creates a set; a name already used in the band is refused (R-05.1, decision 8). */
export async function createSet(form: FormData): Promise<void> {
  const supabase = await client();
  const bandId = field(form, "bandId");
  if (!UUID.test(bandId)) redirect("/bands");
  const set = readSet(form);
  if ("error" in set) redirect(`/bands/${bandId}/sets?error=${set.error}`);
  const id = crypto.randomUUID();
  const { error } = await supabase.from("sets").insert({ id, band_id: bandId, ...set });
  if (error)
    redirect(`/bands/${bandId}/sets?error=${error.code === "23505" ? "name_taken" : "unknown"}`);
  redirect(setPage(id, "created=1"));
}

/** The MD changes the set's name, date or type. */
export async function updateSet(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  if (!UUID.test(setId)) redirect("/bands");
  const set = readSet(form);
  if ("error" in set) redirect(setPage(setId, `error=${set.error}`));
  const { error, count } = await supabase
    .from("sets")
    .update({ ...set, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", setId);
  if (error) redirect(setPage(setId, `error=${error.code === "23505" ? "name_taken" : "unknown"}`));
  redirect(setPage(setId, count === 1 ? "saved=1" : "error=unknown"));
}

/** The MD deletes a set after confirming. */
export async function deleteSet(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const bandId = field(form, "bandId");
  if (!UUID.test(setId) || !UUID.test(bandId)) redirect("/bands");
  if (field(form, "confirm") !== "yes") redirect(setPage(setId, "error=confirm"));
  const { error, count } = await supabase.from("sets").delete({ count: "exact" }).eq("id", setId);
  if (error || count !== 1) redirect(setPage(setId, "error=unknown"));
  redirect(`/bands/${bandId}/sets?deleted=1`);
}

/** From a version's page, the MD adds it to one of their sets (R-05.2). */
export async function addToSet(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const versionId = field(form, "versionId");
  if (!UUID.test(versionId)) redirect("/");
  if (!UUID.test(setId)) redirect(`/versions/${versionId}?set=choose`);
  const { error } = await supabase.rpc("add_to_set", { set_id: setId, version_id: versionId });
  if (error) redirect(`/versions/${versionId}?set=failed`);
  redirect(setPage(setId, "added=1"));
}

/** Moves a song one place up or down (R-05.2). */
export async function moveItem(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const itemId = field(form, "itemId");
  const position = Number(field(form, "position"));
  if (!UUID.test(setId) || !UUID.test(itemId) || !Number.isInteger(position)) redirect("/bands");
  const { error } = await supabase.rpc("move_in_set", { item_id: itemId, new_position: position });
  redirect(setPage(setId, error ? "error=unknown" : "moved=1"));
}

/** Takes a song out of the set. */
export async function removeItem(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const itemId = field(form, "itemId");
  if (!UUID.test(setId) || !UUID.test(itemId)) redirect("/bands");
  const { error } = await supabase.rpc("remove_from_set", { item_id: itemId });
  redirect(setPage(setId, error ? "error=unknown" : "removed=1"));
}

/** A copy of the set under a new name, without a date (R-05.6). */
export async function duplicateSet(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const name = field(form, "name");
  if (!UUID.test(setId)) redirect("/bands");
  if (name.length < 1 || name.length > 80) redirect(setPage(setId, "error=name"));
  const { data, error } = await supabase.rpc("duplicate_set", { set_id: setId, name });
  if (error || typeof data !== "string")
    redirect(setPage(setId, `error=${error?.message === "name_taken" ? "name_taken" : "unknown"}`));
  redirect(setPage(data, "duplicated=1"));
}
