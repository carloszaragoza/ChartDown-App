import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { loadVersion } from "../load";
import { Editor } from "./Editor";

/** The chart editor, for the owner of an active version only (R-02.6, R-03.1). */
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (
    !version?.currentRevisionId ||
    !auth.user ||
    auth.user.id !== version.ownerId ||
    version.status !== "active"
  )
    notFound();
  const { data: revision } = await supabase
    .from("revisions")
    .select("content, number, created_at")
    .eq("id", version.currentRevisionId)
    .maybeSingle();
  if (!revision) notFound();
  const sources = await getTranslations("version.source");

  return (
    <Editor
      versionId={version.id}
      title={version.title}
      visibility={version.visibility}
      revisionId={version.currentRevisionId}
      content={revision.content}
      source={[sources(version.source.type), version.source.year].filter(Boolean).join(" ")}
      revisionNumber={revision.number as number}
      savedAt={revision.created_at as string}
    />
  );
}
