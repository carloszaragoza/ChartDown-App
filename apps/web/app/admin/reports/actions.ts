"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin/guard";

const back = (params: Record<string, string>): never =>
  redirect(`/admin/reports?${new URLSearchParams(params).toString()}`);

/** Hides a reported version and closes its reports; its owner is told why (R-07.2). */
export async function hideVersion(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const title = String(form.get("title") ?? "");
  const { error } = await supabase.rpc("hide_version", {
    version: String(form.get("versionId") ?? ""),
    reason: form.get("reason") === "lyrics" ? "lyrics" : "other",
  });
  revalidatePath("/", "layout");
  back(error ? { error: "failed" } : { hidden: title });
}

/** Shows a hidden version to the community again. */
export async function showVersion(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const title = String(form.get("title") ?? "");
  const { error } = await supabase.rpc("show_version", {
    version: String(form.get("versionId") ?? ""),
  });
  revalidatePath("/", "layout");
  back(error ? { error: "failed" } : { shown: title });
}

/** Closes a report and leaves the version as it is. */
export async function dismissReport(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("dismiss_report", {
    report: String(form.get("reportId") ?? ""),
  });
  back(error ? { error: "failed" } : { dismissed: "1" });
}
