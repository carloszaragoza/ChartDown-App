"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../lib/auth/enabled";
import { withChartVersion } from "../../../lib/chart/version";
import { createClient } from "../../../lib/supabase/server";
import {
  readVersionForm,
  validateVersion,
  type VersionError,
  type VersionValues,
} from "../../../lib/versions/validate";

export interface VersionFormState {
  error: VersionError | null;
  values: VersionValues | null;
}

/**
 * Publishes a new version, and its song if it is new, in one step (R-02.1 to R-02.3). The database
 * function runs with the person's own permissions (Technical Plan, "Create a version").
 */
export async function createVersion(
  _previous: VersionFormState,
  form: FormData,
): Promise<VersionFormState> {
  if (!authEnabled()) redirect("/");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/versions/new");

  const values = readVersionForm(form);
  const checked = validateVersion(values);
  if ("error" in checked) return { error: checked.error, values };

  const { data: id, error } = await supabase.rpc("create_version", {
    ...checked.input,
    content: withChartVersion(checked.input.content),
  });
  if (error || typeof id !== "string") {
    return { error: error?.message === "source_required" ? "source_required" : "unknown", values };
  }
  redirect(`/versions/${id}`);
}
