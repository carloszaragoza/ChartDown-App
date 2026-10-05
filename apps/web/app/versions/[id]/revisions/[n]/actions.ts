"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { createClient } from "../../../../../lib/supabase/server";
import { UUID } from "../../load";

/** Goes back to an earlier revision by saving it again as a new one (R-02.8). */
export async function restoreRevision(form: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  const revisionId = String(form.get("revisionId") ?? "");
  const number = Number(form.get("number"));
  if (!UUID.test(versionId) || !UUID.test(revisionId) || !Number.isInteger(number)) redirect("/");

  const supabase = await createClient();
  const { data: created, error } = await supabase.rpc("restore_revision", {
    revision_id: revisionId,
  });
  if (error || typeof created !== "string")
    redirect(`/versions/${versionId}/revisions/${number}?error=1`);
  const { data: revision } = await supabase
    .from("revisions")
    .select("number")
    .eq("id", created)
    .maybeSingle();
  redirect(`/versions/${versionId}/history?restored=${number}&as=${revision?.number ?? ""}`);
}
