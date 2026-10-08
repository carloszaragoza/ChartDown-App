"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { withChartVersion } from "../../../../lib/chart/version";
import { createClient } from "../../../../lib/supabase/server";
import { normalizeLineBreaks } from "../../../../lib/versions/lines";
import { UUID } from "../load";

export interface SaveState {
  status: "idle" | "saved" | "unchanged" | "changed" | "error";
  /** The revision the editor now works from. */
  baseRevisionId: string;
  /** The text of that revision. */
  savedContent: string;
  /** The new revision's number and when it was saved (ISO), after a save. */
  number?: number;
  savedAt?: string;
}

/**
 * Saves the chart as a new revision (R-02.8, R-03.1), unless it is unchanged or the version
 * moved on since the editor opened it; the text stays on screen either way.
 */
export async function saveChart(previous: SaveState, form: FormData): Promise<SaveState> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  const content = normalizeLineBreaks(String(form.get("content") ?? ""));
  if (!UUID.test(versionId)) return { ...previous, status: "error" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/versions/${versionId}/edit`)}`);

  const { data: version } = await supabase
    .from("versions")
    .select("current_revision_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return { ...previous, status: "error" };
  if (version.current_revision_id !== previous.baseRevisionId)
    return { ...previous, status: "changed" };
  if (content === previous.savedContent) return { ...previous, status: "unchanged" };

  // The chart is saved with the format version it was written for (R-00.4).
  const { data: created, error } = await supabase.rpc("save_revision", {
    version_id: versionId,
    content: withChartVersion(content),
  });
  if (error || typeof created !== "string") return { ...previous, status: "error" };
  const { data: revision } = await supabase
    .from("revisions")
    .select("number")
    .eq("id", created)
    .maybeSingle();
  return {
    status: "saved",
    baseRevisionId: created,
    savedContent: content,
    ...(revision ? { number: revision.number as number } : {}),
    savedAt: new Date().toISOString(),
  };
}
