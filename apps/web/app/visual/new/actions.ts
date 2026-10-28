"use server";

import { redirect } from "next/navigation";
import { requireSignedIn } from "../../../lib/auth/guard";
import { withChartVersion } from "../../../lib/chart/version";
import { withTitle } from "../../../lib/versions/title";
import {
  readVersionForm,
  validateVersion,
  type VersionError,
  type VersionValues,
} from "../../../lib/versions/validate";

export interface NewSongState {
  error: VersionError | null;
  values: VersionValues | null;
}

const METER = /^\d{1,2}\/(1|2|4|8|16)$/;
const UNIT = /^(h\.?|q\.?|e\.?|s)$/;

/**
 * Starts a song in the visual editor (R-13.2): the version as New version creates it (R-02.1 to
 * R-02.3), its chart a header with the meter, the tempo and what it counts, the key and the feel,
 * and a first section to write in; then the visual editor opens on it.
 */
export async function createSong(_previous: NewSongState, form: FormData): Promise<NewSongState> {
  const { supabase } = await requireSignedIn("/visual/new");
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const meta: string[] = [];
  const key = text("key");
  if (/^[A-G][b#]?m?$/.test(key)) meta.push(`key: ${key}`);
  const tempo = text("tempo").replace(/[^\d.]/g, "");
  const unit = text("unit");
  if (tempo) meta.push(`tempo: ${tempo}${UNIT.test(unit) ? ` ${unit}` : ""}`);
  const meter = text("meter");
  if (METER.test(meter)) meta.push(`meter: ${meter}`);
  const feel = text("feel").replace(/\n/g, " ");
  if (feel) meta.push(`feel: ${feel}`);
  const section = text("section").replace(/^#+\s*/, "") || "Verse 1";
  const header = meta.length > 0 ? `---\n${meta.join("\n")}\n---\n\n` : "";
  form.set("content", `${header}## ${section}\n`);

  const values = readVersionForm(form);
  const checked = validateVersion(values);
  if ("error" in checked) return { error: checked.error, values };
  const { data: id, error } = await supabase.rpc("create_version", {
    ...checked.input,
    content: withChartVersion(withTitle(checked.input.content, values.title.trim())),
  });
  if (error || typeof id !== "string") {
    return { error: error?.message === "source_required" ? "source_required" : "unknown", values };
  }
  redirect(`/versions/${id}/visual`);
}
