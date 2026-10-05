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
