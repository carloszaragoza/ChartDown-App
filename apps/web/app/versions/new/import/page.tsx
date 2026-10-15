import { notFound, redirect } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { guessPhone } from "../../../../lib/shell/guessPhone";
import { createClient, readUser } from "../../../../lib/supabase/server";
import { ImportFlow } from "./ImportFlow";

/** Import a chord sheet (SPEC-10, T-1409): signed in, like any new version (R-01.4). */
export default async function ImportPage() {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data: auth } = await readUser(supabase);
  if (!auth.user) redirect("/auth/sign-in?next=/versions/new/import");
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", auth.user.id)
    .maybeSingle();
  return <ImportFlow author={profile?.name ?? ""} phone={await guessPhone()} />;
}
