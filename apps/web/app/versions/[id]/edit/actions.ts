"use server";

import { redirect } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { withChartVersion } from "../../../../lib/chart/version";
import { createClient } from "../../../../lib/supabase/server";
import { normalizeLineBreaks } from "../../../../lib/versions/lines";
import { splitTitle } from "../../../../lib/versions/title";
import { validateSource, type VersionError } from "../../../../lib/versions/validate";
import { UUID } from "../load";

/** The version's source as the editor's form holds it (R-02.2, T-2408). */
export interface SourceValues {
  sourceType: string;
  album: string;
  year: string;
  youtube: string;
}

export interface SaveState {
  status: "idle" | "saved" | "unchanged" | "changed" | "invalid" | "error";
  /** The revision the editor now works from. */
  baseRevisionId: string;
  /** The text of that revision. */
  savedContent: string;
  /** The source as it was last saved. */
  savedSource: SourceValues;
  /** What is wrong with the source, when it was refused. */
  error?: VersionError;
  /** The new revision's number and when it was saved (ISO), after a save of the chart. */
  number?: number;
  savedAt?: string;
}

const sameSource = (a: SourceValues, b: SourceValues) =>
  a.sourceType === b.sourceType &&
  a.album.trim() === b.album.trim() &&
  a.year.trim() === b.year.trim() &&
  a.youtube.trim() === b.youtube.trim();

/**
 * Saves the editor: the chart as a new revision (R-02.8, R-03.1), unless it is unchanged or the
 * version moved on since the editor opened it; and the version's source when its owner changed
 * it, with the same rules as a new version and no new revision (R-02.2, T-2408). What was typed
 * stays on screen when something is refused.
 */
export async function saveChart(previous: SaveState, form: FormData): Promise<SaveState> {
  if (!authEnabled()) redirect("/");
  const versionId = String(form.get("versionId") ?? "");
  const content = normalizeLineBreaks(String(form.get("content") ?? ""));
  const text = (name: string) => String(form.get(name) ?? "");
  const source: SourceValues = {
    sourceType: text("sourceType"),
    album: text("album"),
    year: text("year"),
    youtube: text("youtube"),
  };
  if (!UUID.test(versionId)) return { ...previous, status: "error" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/versions/${versionId}/edit`)}`);

  // The title line is the details', written back on every save: only the rest is the chart.
  const chartChanged = splitTitle(content).body !== splitTitle(previous.savedContent).body;
  const sourceChanged = !sameSource(source, previous.savedSource);
  if (!chartChanged && !sourceChanged) return { ...previous, status: "unchanged" };

  const { data: version } = await supabase
    .from("versions")
    .select("current_revision_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return { ...previous, status: "error" };
  if (chartChanged && version.current_revision_id !== previous.baseRevisionId)
    return { ...previous, status: "changed" };

  let next: SaveState = { ...previous, status: "saved" };
  delete next.error;
  if (sourceChanged) {
    const checked = validateSource(source);
    if ("error" in checked) return { ...previous, status: "invalid", error: checked.error };
    // The owner's update permission on these columns, for an active version (R-02.2).
    const { data: updated, error } = await supabase
      .from("versions")
      .update({ ...checked.source, updated_at: new Date().toISOString() })
      .eq("id", versionId)
      .select("id");
    if (error || updated?.length !== 1) return { ...previous, status: "error" };
    next = { ...next, savedSource: source };
  }

  if (chartChanged) {
    // The chart is saved with the format version it was written for (R-00.4).
    const { data: created, error } = await supabase.rpc("save_revision", {
      version_id: versionId,
      content: withChartVersion(content),
    });
    if (error || typeof created !== "string") return { ...next, status: "error" };
    const { data: revision } = await supabase
      .from("revisions")
      .select("number")
      .eq("id", created)
      .maybeSingle();
    next = {
      ...next,
      baseRevisionId: created,
      savedContent: content,
      ...(revision ? { number: revision.number as number } : {}),
      savedAt: new Date().toISOString(),
    };
  }
  return next;
}
