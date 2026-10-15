"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin/guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Invites a person waiting: a single-use code noted with their email, and the entry marked (R-07.5). */
export async function inviteFromWaitlist(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const entry = String(form.get("id") ?? "");
  if (!UUID.test(entry)) redirect("/admin/waitlist?error=1");
  const { data, error } = await supabase.rpc("invite_from_waitlist", { entry });
  if (error || typeof data !== "string") redirect("/admin/waitlist?error=1");
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin/invites");
  redirect(`/admin/waitlist?invited=${encodeURIComponent(data)}`);
}
