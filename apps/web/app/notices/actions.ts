"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { noticeHref } from "../../lib/notices/notice";
import { createClient } from "../../lib/supabase/server";

/** Opens a notice: marks it read and goes to what it is about (T-1002). */
export async function openNotice(form: FormData) {
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  // Row-level security finds only the person's own notice; where it leads is read from it.
  const { data } = await supabase
    .from("notifications")
    .select("type, detail")
    .eq("id", id)
    .maybeSingle();
  if (!data) redirect("/notices");
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  revalidatePath("/", "layout");
  redirect(noticeHref(data as { type: string; detail: Record<string, unknown> }));
}

/** Marks every unread notice of the person as read. */
export async function markAllRead() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/sign-in?next=/notices");
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", data.user.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}
