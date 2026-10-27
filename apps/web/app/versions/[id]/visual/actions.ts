"use server";

import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { UUID } from "../load";

/**
 * Renames the song from the visual editor's header (R-13.2). The title is the song's, shared by
 * all its versions, so row-level security lets only an administrator change it (R-02.2); anyone
 * else gets "error" and the title stays.
 */
export async function renameSong(
  versionId: string,
  title: string,
): Promise<"saved" | "invalid" | "error"> {
  if (!authEnabled() || !UUID.test(versionId)) return "error";
  const name = title.trim();
  if (name.length < 1 || name.length > 200) return "invalid";
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("versions")
    .select("song_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return "error";
  const { data: updated, error } = await supabase
    .from("songs")
    .update({ title: name, updated_at: new Date().toISOString() })
    .eq("id", version.song_id)
    .select("id");
  return error || updated?.length !== 1 ? "error" : "saved";
}
