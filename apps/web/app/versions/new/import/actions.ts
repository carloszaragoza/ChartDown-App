"use server";

import { createClient, readUser } from "../../../../lib/supabase/server";

export interface ExistingSong {
  id: string;
  title: string;
  artists: string[];
}

/**
 * A song already in the catalog with the imported sheet's title (R-10.12), so the person can add
 * their version to it instead of making a duplicate. Titles match ignoring case and spaces.
 */
export async function findSong(title: string): Promise<ExistingSong | null> {
  const clean = title.trim().slice(0, 200);
  if (!clean) return null;
  const supabase = await createClient();
  const { data: auth } = await readUser(supabase);
  if (!auth.user) return null;
  const { data } = await supabase
    .from("songs")
    .select("id, title, artists")
    .ilike(
      "title",
      clean.replace(/[\\%_]/g, (character) => `\\${character}`),
    )
    .limit(1)
    .maybeSingle();
  return (data as ExistingSong | null) ?? null;
}
