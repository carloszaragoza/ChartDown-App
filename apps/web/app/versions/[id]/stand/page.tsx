import { parse } from "chartdown";
import { notFound } from "next/navigation";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { readDisplay } from "../display";
import { loadVersion } from "../load";
import { readSection } from "./standHref";
import { StandMode } from "./StandMode";

type Search = Promise<{ s?: string; view?: string; key?: string; theme?: string }>;

/**
 * Stand mode for a version (R-03.3), for anyone who can read it. Outside a set it shows no
 * band's layer (R-06.5).
 */
export default async function StandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const search = await searchParams;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version?.currentRevisionId) notFound();
  const { data: revision } = await supabase
    .from("revisions")
    .select("content")
    .eq("id", version.currentRevisionId)
    .maybeSingle();
  if (!revision) notFound();
  const chart = parse(revision.content);
  const display = readDisplay(chart, search);

  return (
    <StandMode
      versionId={version.id}
      title={version.title}
      content={revision.content}
      section={readSection(chart, search.s)}
      style={display.style}
      homeKey={display.key}
      theme={search.theme === "stage" ? "stage" : "light"}
    />
  );
}
