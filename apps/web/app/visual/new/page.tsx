import { requireSignedIn } from "../../../lib/auth/guard";
import { guessPhone } from "../../../lib/shell/guessPhone";
import { PhoneOnly } from "../PhoneOnly";
import { NewSongForm } from "./NewSongForm";

/**
 * New song in the visual editor (R-13.2): open to everyone signed in during the beta (R-13.1;
 * owner's decision, October 28, 2026). A phone keeps New version and the Chart editor (R-13.12).
 */
export default async function NewSongPage() {
  const { supabase, userId } = await requireSignedIn("/visual/new");
  if (await guessPhone()) return <PhoneOnly href="/versions/new" />;
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  return <NewSongForm defaultArranger={(profile?.name as string | undefined) ?? ""} />;
}
