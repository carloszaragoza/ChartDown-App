"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin/guard";
import { readInvite } from "../../../lib/admin/invites";

const back = (query: string): never => redirect(`/admin/invites?${query}`);

/** Creates an invite code (R-01.7); the database picks the code and logs it (T-1101). */
export async function createInvite(form: FormData): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  const read = readInvite({
    kind: form.get("kind"),
    max_uses: form.get("max_uses"),
    note: form.get("note"),
  });
  if ("problem" in read) return back(`error=${read.problem}`);
  const { data, error } = await supabase
    .from("invite_codes")
    .insert({ ...read.fields, created_by: userId })
    .select("code")
    .single();
  if (error || !data) back("error=unknown");
  revalidatePath("/admin/invites");
  back(`created=${data?.code ?? ""}`);
}

/** Revokes a code: it stops working at once, for claims not yet used too (R-01.7). */
export async function revokeInvite(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("invite_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", String(form.get("id") ?? ""))
    .is("revoked_at", null)
    .select("code")
    .maybeSingle();
  if (error || !data) back("error=unknown");
  revalidatePath("/admin/invites");
  back(`revoked=${data?.code ?? ""}`);
}
