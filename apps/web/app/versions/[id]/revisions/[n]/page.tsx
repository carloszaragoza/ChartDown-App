import { parse } from "chartdown";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { createClient, readUser } from "../../../../../lib/supabase/server";
import { readDisplay } from "../../display";
import { loadVersion } from "../../load";
import { VersionView } from "../../VersionView";
import { restoreRevision } from "./actions";

/** One revision of a version, read-only, for its owner, who may restore it (R-02.8). */
export default async function RevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Promise<{ error?: string; view?: string; key?: string; beats?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id, n } = await params;
  const number = Number(n);
  if (!Number.isInteger(number) || number < 1) notFound();
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    readUser(supabase),
  ]);
  if (!version || !auth.user || auth.user.id !== version.ownerId) notFound();

  const { data: revision } = await supabase
    .from("revisions")
    .select("id, content")
    .eq("version_id", version.id)
    .eq("number", number)
    .maybeSingle();
  if (!revision) notFound();
  const search = await searchParams;
  const { error } = search;
  const chart = parse(revision.content);
  const t = await getTranslations("history");
  const isCurrent = revision.id === version.currentRevisionId;

  // A read-only banner above the chart, with the way back and, for an earlier one, Restore.
  const notice = (
    <section aria-label={t("revision", { number })}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Banner
          status="info"
          title={`${t("revision", { number })} · ${isCurrent ? t("isCurrent") : t("readOnly")}`}
        />
        <Button label={t("backToHistory")} href={`/versions/${version.id}/history`} />
        {!isCurrent && version.status === "active" && (
          <form action={restoreRevision}>
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="revisionId" value={revision.id} />
            <input type="hidden" name="number" value={number} />
            <Button type="submit" variant="primary" label={t("restore")} />
          </form>
        )}
      </HStack>
      {error && <Banner status="error" title={t("restoreError")} />}
    </section>
  );

  return (
    <VersionView
      id={version.id}
      title={version.title}
      artists={version.artists}
      author={version.author}
      source={version.source}
      chart={chart}
      display={readDisplay(chart, search)}
      path={`/versions/${version.id}/revisions/${number}`}
      signedIn
      notice={notice}
    />
  );
}
