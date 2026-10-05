"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { UUID } from "../versions/[id]/load";

const field = (form: FormData, name: string) => String(form.get(name) ?? "");
const bandPage = (bandId: string, extra: string) => `/bands/${bandId}?${extra}`;

async function signedIn() {
  if (!authEnabled()) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/sign-in?next=/bands");
  return supabase;
}

/** A new band, with its creator as its only MD (R-04.1). */
export async function createBand(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const { data, error } = await supabase.rpc("create_band", { name: field(form, "name") });
  if (error || typeof data !== "string") redirect("/bands?error=name");
  redirect(`/bands/${data}?created=1`);
}

/** The MD renames the band (Technical Plan 8.1). */
export async function renameBand(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const bandId = field(form, "bandId");
  const name = field(form, "name").trim();
  if (!UUID.test(bandId)) redirect("/bands");
  if (name.length < 1 || name.length > 80) redirect(bandPage(bandId, "error=name"));
  const { error, count } = await supabase
    .from("bands")
    .update({ name, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", bandId);
  redirect(bandPage(bandId, error || count !== 1 ? "error=unknown" : "renamed=1"));
}

/** The MD invites someone by email; it never says whether they have an account (R-04.2). */
export async function inviteMember(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const bandId = field(form, "bandId");
  if (!UUID.test(bandId)) redirect("/bands");
  const { error } = await supabase.rpc("invite_to_band", {
    band_id: bandId,
    email: field(form, "email"),
  });
  const reason =
    error?.message === "email_invalid" || error?.message === "yourself" ? error.message : "unknown";
  redirect(bandPage(bandId, error ? `error=${reason}` : "invited=1"));
}

/** The MD cancels a pending invitation. */
export async function cancelInvitation(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const bandId = field(form, "bandId");
  const invitationId = field(form, "invitationId");
  if (!UUID.test(bandId) || !UUID.test(invitationId)) redirect("/bands");
  const { error } = await supabase.from("band_invitations").delete().eq("id", invitationId);
  redirect(bandPage(bandId, error ? "error=unknown" : "cancelled=1"));
}

/** The invitee accepts or declines (R-04.2). */
export async function answerInvitation(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const invitationId = field(form, "invitationId");
  const accept = field(form, "answer") === "accept";
  if (!UUID.test(invitationId)) redirect("/bands");
  const { data, error } = await supabase.rpc("respond_to_invitation", {
    invitation_id: invitationId,
    accept,
  });
  if (error || typeof data !== "string") redirect("/bands?error=unknown");
  redirect(accept ? `/bands/${data}?joined=1` : "/bands?declined=1");
}

/** The MD sets a member's default instruments (R-04.3). */
export async function setMemberInstruments(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const bandId = field(form, "bandId");
  const memberId = field(form, "memberId");
  if (!UUID.test(bandId) || !UUID.test(memberId)) redirect("/bands");
  const chosen = new Set(
    form
      .getAll("instrument")
      .map(String)
      .filter((id) => UUID.test(id)),
  );
  const { data: current } = await supabase
    .from("member_instruments")
    .select("instrument_id")
    .eq("member_id", memberId);
  const had = new Set((current ?? []).map((row) => row.instrument_id as string));
  const removed = [...had].filter((id) => !chosen.has(id));
  const added = [...chosen].filter((id) => !had.has(id));
  if (removed.length > 0) {
    const { error } = await supabase
      .from("member_instruments")
      .delete()
      .eq("member_id", memberId)
      .in("instrument_id", removed);
    if (error) redirect(bandPage(bandId, "error=unknown"));
  }
  if (added.length > 0) {
    const { error } = await supabase
      .from("member_instruments")
      .insert(added.map((instrument_id) => ({ member_id: memberId, instrument_id })));
    if (error) redirect(bandPage(bandId, "error=unknown"));
  }
  redirect(bandPage(bandId, "instruments=1"));
}

/** The MD removes a musician (R-04.4). */
export async function removeMember(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const bandId = field(form, "bandId");
  const memberId = field(form, "memberId");
  if (!UUID.test(bandId) || !UUID.test(memberId)) redirect("/bands");
  const { error, count } = await supabase
    .from("band_members")
    .delete({ count: "exact" })
    .eq("id", memberId);
  redirect(bandPage(bandId, error || count !== 1 ? "error=unknown" : "removed=1"));
}

/** A musician leaves the band and loses access to it at once (R-04.4). */
export async function leaveBand(form: FormData): Promise<void> {
  const supabase = await signedIn();
  const bandId = field(form, "bandId");
  if (!UUID.test(bandId)) redirect("/bands");
  const { data } = await supabase.auth.getUser();
  const { error, count } = await supabase
    .from("band_members")
    .delete({ count: "exact" })
    .eq("band_id", bandId)
    .eq("user_id", data.user?.id ?? "");
  redirect(error || count !== 1 ? bandPage(bandId, "error=unknown") : "/bands?left=1");
}
