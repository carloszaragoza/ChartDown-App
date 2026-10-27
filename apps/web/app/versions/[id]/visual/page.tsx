import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin/guard";
import { guessPhone } from "../../../../lib/shell/guessPhone";
import { PhoneOnly } from "../../../visual/PhoneOnly";
import { loadVersion } from "../load";
import { loadRecordings } from "../recordings";
import { VisualEditor } from "./VisualEditor";

/**
 * The visual editor for a version (SPEC-13): its owner writes the chart on the chart itself. It is
 * the paid plan's editor; until the plans exist, only administrators open it (R-13.1). A phone
 * keeps the Chart editor (R-13.12).
 */
export default async function VisualPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId } = await requireAdmin();
  const { id } = await params;
  const version = await loadVersion(supabase, id);
  if (!version?.currentRevisionId || userId !== version.ownerId || version.status !== "active")
    notFound();
  if (await guessPhone()) return <PhoneOnly href={`/versions/${version.id}/edit`} />;
  const { data: revision } = await supabase
    .from("revisions")
    .select("content")
    .eq("id", version.currentRevisionId)
    .maybeSingle();
  if (!revision) notFound();
  const [{ recordings, bands }, { data: canRename }] = await Promise.all([
    loadRecordings(supabase, version.id, userId),
    // Its title and artists are the song's: renamed by an administrator or its only owner (R-02.2).
    supabase.rpc("can_rename_song", { version_id: version.id }),
  ]);

  return (
    <VisualEditor
      versionId={version.id}
      title={version.title}
      canRename={canRename === true}
      artists={version.artists}
      author={version.author}
      revisionId={version.currentRevisionId}
      content={revision.content as string}
      source={{
        sourceType: version.source.type,
        album: version.source.album ?? "",
        year: version.source.year ? String(version.source.year) : "",
        youtube: version.source.youtube ?? "",
      }}
      videoStart={version.videoStart ?? null}
      videoEnd={version.videoEnd ?? null}
      recordings={recordings}
      bands={bands}
    />
  );
}
