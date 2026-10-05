"use server";

import { keyName, parse } from "@chartdown/core";
import { redirect } from "next/navigation";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { keysInMode } from "../versions/[id]/display";
import { UUID } from "../versions/[id]/load";

const TYPES = new Set(["rehearsal", "service", "concert"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const setPage = (setId: string, extra: string) => `/sets/${setId}?${extra}`;

async function client() {
  if (!authEnabled()) redirect("/");
  return createClient();
}

/** Name, optional date and time, and type, as the MD wrote them (R-05.1, T-708). */
function readSet(form: FormData) {
  const name = field(form, "name");
  const date = field(form, "date");
  const time = field(form, "time");
  const type = field(form, "type");
  if (name.length < 1 || name.length > 80) return { error: "name" as const };
  if (date && !DATE.test(date)) return { error: "date" as const };
  if (time && !TIME.test(time)) return { error: "time" as const };
  if (time && !date) return { error: "time_needs_date" as const };
  if (!TYPES.has(type)) return { error: "type" as const };
  return { name, date: date || null, time: time || null, type };
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
  const [{ data: before }, { data: tempMd }] = await Promise.all([
    supabase.from("sets").select("date").eq("id", setId).maybeSingle(),
    supabase.from("set_temp_md").select("until").eq("set_id", setId).maybeSingle(),
  ]);
  const { error, count } = await supabase
    .from("sets")
    .update({ ...set, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", setId);
  if (error) redirect(setPage(setId, `error=${error.code === "23505" ? "name_taken" : "unknown"}`));
  // The temporary MD's day follows the set's date, unless it had been set to another day.
  if (
    count === 1 &&
    tempMd &&
    tempMd.until === (before?.date ?? null) &&
    before?.date !== set.date
  ) {
    await supabase.from("set_temp_md").update({ until: set.date }).eq("set_id", setId);
  }
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

/**
 * The set's whole lineup from the form: for each member, the instruments ticked (R-05.3). Only
 * what changed is written (save_lineup).
 */
export async function saveLineup(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  if (!UUID.test(setId)) redirect("/bands");
  const members = form
    .getAll("member")
    .map(String)
    .filter((id) => UUID.test(id));
  const entries = members.map((memberId) => ({
    member_id: memberId,
    instrument_ids: form
      .getAll(`instrument-${memberId}`)
      .map(String)
      .filter((id) => UUID.test(id)),
  }));
  const { error } = await supabase.rpc("save_lineup", { set_id: setId, entries });
  redirect(setPage(setId, error ? "error=unknown" : "lineup=1"));
}

/** Back to the band's default instruments: the set's own lineup is deleted (R-05.3). */
export async function resetLineup(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  if (!UUID.test(setId)) redirect("/bands");
  const { error } = await supabase.from("set_lineup").delete().eq("set_id", setId);
  redirect(setPage(setId, error ? "error=unknown" : "defaults=1"));
}

/**
 * A song's key in this set, or none for its written key (R-05.4). Only the 12 keys of the
 * pinned revision's mode; the version never changes.
 */
export async function setSongKey(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const itemId = field(form, "itemId");
  const key = field(form, "key");
  if (!UUID.test(setId) || !UUID.test(itemId)) redirect("/bands");
  const { data: item } = await supabase
    .from("set_items")
    .select("revision:revisions(content)")
    .eq("id", itemId)
    .maybeSingle();
  const revision = Array.isArray(item?.revision) ? item.revision[0] : item?.revision;
  if (!revision) redirect(setPage(setId, "error=unknown"));
  const chart = parse((revision as { content: string }).content);
  if (key && !keysInMode(chart.key.minor).some((option) => keyName(option) === key))
    redirect(setPage(setId, "error=key"));
  const { error, count } = await supabase
    .from("set_items")
    .update({ set_key: key || null }, { count: "exact" })
    .eq("id", itemId);
  redirect(setPage(setId, error || count !== 1 ? "error=unknown" : "key=1"));
}

/** The MD moves a song to its version's current revision, the one the author published (R-05.2). */
export async function updatePinned(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const itemId = field(form, "itemId");
  if (!UUID.test(setId) || !UUID.test(itemId)) redirect("/bands");
  const { error } = await supabase.rpc("update_pinned_revision", { item_id: itemId });
  redirect(setPage(setId, error ? "error=unknown" : "updated=1"));
}

/**
 * The MD appoints a musician of the band as the set's temporary MD, until a day (the set's
 * date by default) (R-05.5). Appointing someone else replaces the previous one, so the new
 * appointment is recorded as its own event.
 */
export async function appointTempMd(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  const memberId = field(form, "memberId");
  const until = field(form, "until");
  if (!UUID.test(setId)) redirect("/bands");
  if (!UUID.test(memberId)) redirect(setPage(setId, "error=temp_md"));
  if (until && !DATE.test(until)) redirect(setPage(setId, "error=date"));
  const { data: set } = await supabase.from("sets").select("band_id").eq("id", setId).maybeSingle();
  const { data: member } = await supabase
    .from("band_members")
    .select("role")
    .eq("id", memberId)
    .eq("band_id", set?.band_id ?? "")
    .maybeSingle();
  // Only a musician of the band; the MD does not appoint themselves.
  if (!set || member?.role !== "musician") redirect(setPage(setId, "error=temp_md"));
  const { error: removed } = await supabase.from("set_temp_md").delete().eq("set_id", setId);
  if (removed) redirect(setPage(setId, "error=unknown"));
  const { error } = await supabase.from("set_temp_md").insert({
    set_id: setId,
    band_id: set.band_id,
    member_id: memberId,
    ...(until ? { until } : {}),
  });
  redirect(setPage(setId, error ? "error=unknown" : "appointed=1"));
}

/** The MD ends the temporary MD's role before the set's date (R-05.5). */
export async function removeTempMd(form: FormData): Promise<void> {
  const supabase = await client();
  const setId = field(form, "setId");
  if (!UUID.test(setId)) redirect("/bands");
  const { error } = await supabase.from("set_temp_md").delete().eq("set_id", setId);
  redirect(setPage(setId, error ? "error=unknown" : "unappointed=1"));
}
