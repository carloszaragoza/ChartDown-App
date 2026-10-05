"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin/guard";
import { readInstrument, readSlug } from "../../../lib/admin/instruments";

const back = (query: string): never => redirect(`/admin/instruments?${query}`);

/** Adds an instrument to the catalog (R-07.3). The database logs it (T-1101). */
export async function addInstrument(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const slug = readSlug(form.get("slug"));
  if (!slug) back("error=slug");
  const read = readInstrument({
    name_en: form.get("name_en"),
    name_es: form.get("name_es"),
    aliases: form.get("aliases"),
  });
  if ("problem" in read) return back(`error=${read.problem}`);
  const { error } = await supabase.from("instruments").insert({ slug, ...read.fields });
  if (error) back(error.code === "23505" ? "error=taken" : "error=unknown");
  revalidatePath("/", "layout");
  back(`saved=${slug}`);
}

/** Renames an instrument or changes its aliases; its slug stays, since charts use it. */
export async function updateInstrument(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const read = readInstrument({
    name_en: form.get("name_en"),
    name_es: form.get("name_es"),
    aliases: form.get("aliases"),
  });
  if ("problem" in read) return back(`error=${read.problem}`);
  const { data, error } = await supabase
    .from("instruments")
    .update(read.fields)
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error || !data) back("error=unknown");
  revalidatePath("/", "layout");
  back(`saved=${data?.slug ?? ""}`);
}

/** Deactivates or reactivates an instrument: never deleted (R-07.3, decision 5). */
export async function setInstrumentActive(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const active = form.get("active") === "true";
  const { data, error } = await supabase
    .from("instruments")
    .update({ active })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error || !data) back("error=unknown");
  revalidatePath("/", "layout");
  back(`${active ? "reactivated" : "deactivated"}=${data?.slug ?? ""}`);
}
