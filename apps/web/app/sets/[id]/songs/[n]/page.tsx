import { keyName, parse } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { setSongKey } from "../../../../../lib/sets/lineup";
import { createClient } from "../../../../../lib/supabase/server";
import { ChartBody } from "../../../../versions/[id]/ChartBody";
import { UUID } from "../../../../versions/[id]/load";
import { updatePinned } from "../../../actions";
import styles from "../../../sets.module.css";

type One<T> = T | T[] | null;
const one = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
interface Revision {
  number: number;
  content: string;
}

/**
 * A song as this set plays it (R-05.2, R-05.4): its pinned revision, in the set's key, as
 * numbers or letters. The version itself never changes. With `?preview=new` the MD previews the
 * author's newer revision before updating (decision 9.2). Notes per instrument come with T-801.
 */
export default async function SetSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Promise<{ view?: string; preview?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id, n } = await params;
  const position = Number(n);
  if (!UUID.test(id) || !Number.isInteger(position) || position < 1) notFound();
  const supabase = await createClient();
  const [{ data: set }, { data: item }, { count }, { data: auth }] = await Promise.all([
    supabase.from("sets").select("id, name, band_id").eq("id", id).maybeSingle(),
    supabase
      .from("set_items")
      .select(
        "id, set_key, pinned_revision_id, version:versions(id, author_name, current_revision_id, song:songs(title)), revision:revisions(number, content)",
      )
      .eq("set_id", id)
      .eq("position", position)
      .maybeSingle(),
    supabase.from("set_items").select("id", { count: "exact", head: true }).eq("set_id", id),
    supabase.auth.getUser(),
  ]);
  const pinned = one(item?.revision as One<Revision>);
  if (!set || !item || !pinned) notFound();
  const version = one(
    item.version as One<{
      id: string;
      author_name: string;
      current_revision_id: string | null;
      song: One<{ title: string }>;
    }>,
  );
  const title = one(version?.song ?? null)?.title ?? "";
  const { view, preview } = await searchParams;

  // The author's newer revision, only when asked for and only if there is one.
  const newerId =
    preview === "new" && version?.current_revision_id !== item.pinned_revision_id
      ? version?.current_revision_id
      : null;
  const [{ data: newer }, { data: me }] = await Promise.all([
    newerId
      ? supabase.from("revisions").select("number, content").eq("id", newerId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("band_members")
      .select("role")
      .eq("band_id", set.band_id)
      .eq("user_id", auth.user?.id ?? "")
      .maybeSingle(),
  ]);
  const revision = (newer as Revision | null) ?? pinned;

  const chart = parse(revision.content);
  const homeKey = setSongKey(chart, item.set_key as string | null);
  const style = view === "letters" ? "letters" : "numbers";
  const t = await getTranslations("sets");
  const v = await getTranslations("viewer");
  const c = await getTranslations("chart");
  const path = `/sets/${set.id}/songs/${position}`;
  const total = count ?? position;
  const keep = style === "letters" ? "?view=letters" : "";
  const withPreview = (query: string) =>
    newer
      ? `${path}?${[query, "preview=new"].filter(Boolean).join("&")}`
      : `${path}${query ? `?${query}` : ""}`;

  return (
    <main className={styles.wide}>
      <p className={styles.hint}>
        <Link href={`/sets/${set.id}`} className={styles.link}>
          {set.name}
        </Link>{" "}
        · {t("songOf", { position, total })}
      </p>
      {newer && (
        <div className={styles.update}>
          <p className={styles.text}>
            {t("previewing", { number: revision.number, pinned: pinned.number })}
          </p>
          {me?.role === "md" && (
            <form action={updatePinned}>
              <input type="hidden" name="setId" value={set.id} />
              <input type="hidden" name="itemId" value={item.id as string} />
              <Button type="submit" variant="primary">
                {t("update")}
              </Button>
            </form>
          )}
        </div>
      )}
      <div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.hint}>
          {t("by", { author: version?.author_name ?? "" })} ·{" "}
          {t("revision", { number: revision.number })}
        </p>
        <p className={styles.hint}>
          {c("key")} <b>{keyName(homeKey)}</b>
          {keyName(homeKey) !== keyName(chart.key) && (
            <> {c("writtenIn", { key: keyName(chart.key) })}</>
          )}
        </p>
      </div>
      <nav aria-label={v("style")} className={styles.buttons}>
        {(["numbers", "letters"] as const).map((option) => (
          <Link
            key={option}
            href={withPreview(option === "letters" ? "view=letters" : "")}
            className={styles.choice}
            aria-current={style === option ? "true" : undefined}
          >
            {v(option)}
          </Link>
        ))}
      </nav>
      <ChartBody chart={chart} style={style} homeKey={homeKey} />
      <nav aria-label={t("songs", { count: total })} className={styles.turn}>
        {position > 1 ? (
          <Link href={`/sets/${set.id}/songs/${position - 1}${keep}`} className={styles.link}>
            {t("previousSong")}
          </Link>
        ) : (
          <span />
        )}
        {position < total ? (
          <Link href={`/sets/${set.id}/songs/${position + 1}${keep}`} className={styles.link}>
            {t("nextSong")}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
