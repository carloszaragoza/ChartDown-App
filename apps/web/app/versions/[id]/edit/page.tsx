import { notFound } from "next/navigation";
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
    .select("content")
    .eq("id", version.currentRevisionId)
    .maybeSingle();
  if (!revision) notFound();

  return (
    <Editor
      versionId={version.id}
      title={version.title}
      visibility={version.visibility}
      revisionId={version.currentRevisionId}
      content={revision.content}
    />
  );
}
