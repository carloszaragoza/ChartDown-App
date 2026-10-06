import { notFound } from "next/navigation";
import { authEnabled } from "../auth/enabled";
import { createClient } from "../supabase/server";

/**
 * The Admin's pages (E11): anyone who is not an admin gets a page not found, so the area is not
 * even revealed. Row-level security still decides every read and write (Technical Plan 8.1).
 */
export async function requireAdmin() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (data?.role !== "admin") notFound();
  return { supabase, userId: auth.user.id };
}
