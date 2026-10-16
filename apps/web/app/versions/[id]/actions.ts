"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "./load";

/** Makes the signed-in person's own public copy of a version, and opens it (R-02.6, R-02.7). */
export async function forkVersion(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  if (!UUID.test(versionId)) redirect("/");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/versions/${versionId}`)}`);

  const { data: created, error } = await supabase.rpc("fork_version", { version_id: versionId });
  if (error || typeof created !== "string") redirect(`/versions/${versionId}?fork=failed`);
  redirect(`/versions/${created}`);
}

/**
 * Makes the owner's public version private: they get a private copy, and the public one stays,
 * frozen under their name (R-02.4, decisions 6 and 9.4). Opens the private copy.
 */
export async function makePrivate(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  if (!UUID.test(versionId)) redirect("/");
  const supabase = await createClient();
  const { data: created, error } = await supabase.rpc("make_private", { version_id: versionId });
  if (error || typeof created !== "string") redirect(`/versions/${versionId}/make-private?error=1`);
  redirect(`/versions/${created}`);
}

/** Reports a public version to the administrators, with a reason and an optional note (R-07.2). */
export async function reportVersion(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  if (!UUID.test(versionId)) redirect("/");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/versions/${versionId}`)}`);

  const reason = form.get("reason") === "lyrics" ? "lyrics" : "other";
  const note = String(form.get("note") ?? "")
    .trim()
    .slice(0, 500);
  // Row-level security decides who may report what; nobody reads a report back but admins.
  const { error } = await supabase
    .from("reports")
    .insert({ version_id: versionId, reporter_id: auth.user.id, reason, note: note || null });
  const result = !error ? "sent" : error.code === "23505" ? "already" : "failed";
  redirect(`/versions/${versionId}?report=${result}`);
}

/**
 * Saves where the music starts in the version's video, for everyone (R-03.11, T-2503). Only the
 * owner of an active version can: the database's policy finds no other. True when it was saved.
 */
export async function saveVideoStart(versionId: string, milliseconds: number): Promise<boolean> {
  if (!authEnabled() || !UUID.test(versionId)) return false;
  const value = Math.round(milliseconds);
  if (!Number.isFinite(value) || value < 0 || value > 3_600_000) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("versions")
    .update({ video_start_ms: value })
    .eq("id", versionId)
    .select("id");
  return !error && (data?.length ?? 0) === 1;
}
