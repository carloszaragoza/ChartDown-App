import { keyName, parse, type Chart } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { setSongKey } from "../../../../../lib/sets/lineup";
import { songView, type SetSong } from "../../../../../lib/sets/song";
import { createClient } from "../../../../../lib/supabase/server";
import { ChartBody } from "../../../../versions/[id]/ChartBody";
import { UUID } from "../../../../versions/[id]/load";
import { updatePinned } from "../../../actions";
import styles from "../../../sets.module.css";

interface Revision {
  number: number;
  content: string;
}

/**
 * A song as this set plays it, for the person opening it (R-05.2, R-05.4, R-06.1 to R-06.4): its
 * pinned revision in the set's key, as numbers or letters, with the notes they may see. The
 * server (`set_song`) decides which band notes reach this device; nobody else's arrive. With
 * `?preview=new` the MD previews the author's newer revision before updating (decision 9.2).
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
  const [{ data, error }, { count }] = await Promise.all([
    supabase.rpc("set_song", { set_id: id, position }),
    supabase.from("set_items").select("id", { count: "exact", head: true }).eq("set_id", id),
  ]);
  if (error || !data) notFound();
  const song = data as SetSong;
  const { view, preview } = await searchParams;

  // The author's newer revision, only for the MD, only when asked for, only if there is one.
  const newerId =
    preview === "new" && song.role === "md" && song.current_revision_id !== song.revision_id
      ? song.current_revision_id
      : null;
  const { data: newer } = newerId
    ? await supabase.from("revisions").select("number, content").eq("id", newerId).maybeSingle()
    : { data: null };
  const revision: Revision = (newer as Revision | null) ?? {
    number: song.revision_number,
    content: song.content,
  };

  // Each band note is placed against the chart it was anchored to, so shifted sections show.
  const chart = parse(revision.content);
  const earlier = [...new Set(song.notes.map((note) => note.anchored_revision_id))].filter(
    (revisionId) => revisionId !== song.revision_id,
  );
  const { data: anchoredRows } = earlier.length
    ? await supabase.from("revisions").select("id, content").in("id", earlier)
    : { data: [] };
  const anchored = new Map<string, Chart>([[song.revision_id, parse(song.content)]]);
  for (const row of anchoredRows ?? [])
    anchored.set(row.id as string, parse(row.content as string));
  const shown = songView(chart, song, (revisionId) => anchored.get(revisionId));

  const homeKey = setSongKey(chart, song.set_key);
  const style = view === "letters" ? "letters" : "numbers";
  const t = await getTranslations("sets");
  const v = await getTranslations("viewer");
  const c = await getTranslations("chart");
  const path = `/sets/${song.set_id}/songs/${position}`;
  const total = count ?? position;
  const keep = style === "letters" ? "?view=letters" : "";
  const withPreview = (query: string) =>
    newer
      ? `${path}?${[query, "preview=new"].filter(Boolean).join("&")}`
      : `${path}${query ? `?${query}` : ""}`;
  const barLabel = (bar: number) => t("bar", { bar });

  return (
    <main className={styles.wide}>
      <p className={styles.hint}>
        <Link href={`/sets/${song.set_id}`} className={styles.link}>
          {song.set_name}
        </Link>{" "}
        · {t("songOf", { position, total })}
      </p>
      {newer && (
        <div className={styles.update}>
          <p className={styles.text}>
            {t("previewing", { number: revision.number, pinned: song.revision_number })}
          </p>
          <form action={updatePinned}>
            <input type="hidden" name="setId" value={song.set_id} />
            <input type="hidden" name="itemId" value={song.item_id} />
            <Button type="submit" variant="primary">
              {t("update")}
            </Button>
          </form>
        </div>
      )}
      <div>
        <h1 className={styles.title}>{song.title}</h1>
        <p className={styles.hint}>
          {t("by", { author: song.author_name })} · {t("revision", { number: revision.number })}
        </p>
        <p className={styles.hint}>
          {c("key")} <b>{keyName(homeKey)}</b>
          {keyName(homeKey) !== keyName(chart.key) && (
            <> {c("writtenIn", { key: keyName(chart.key) })}</>
          )}
        </p>
        <p className={styles.hint}>
          {song.role === "musician"
            ? t("notesForYou", { count: shown.forYou })
            : song.role === "md"
              ? t("allNotesMd")
              : t("allNotesTempMd")}
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
      {shown.unplaced.length > 0 && (
        <section aria-labelledby="unplaced" className={styles.update}>
          <h2 id="unplaced" className={styles.label}>
            {t("unplacedNotes")}
          </h2>
          <ul className={styles.items}>
            {shown.unplaced.map(({ note }) => (
              <li key={note.id} className={styles.text}>
                {note.section} · {note.text}
              </li>
            ))}
          </ul>
        </section>
      )}
      <ChartBody
        chart={chart}
        style={style}
        homeKey={homeKey}
        notes={(index) =>
          (shown.sections[index] ?? []).map((note) => ({
            md: note.md,
            roles: note.roles,
            text: note.bar ? `${barLabel(note.bar)} · ${note.text}` : note.text,
          }))
        }
      />
      <nav aria-label={t("songs", { count: total })} className={styles.turn}>
        {position > 1 ? (
          <Link href={`/sets/${song.set_id}/songs/${position - 1}${keep}`} className={styles.link}>
            {t("previousSong")}
          </Link>
        ) : (
          <span />
        )}
        {position < total ? (
          <Link href={`/sets/${song.set_id}/songs/${position + 1}${keep}`} className={styles.link}>
            {t("nextSong")}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
