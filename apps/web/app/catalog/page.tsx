import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { SOURCE_TYPES, type SourceType } from "../../lib/versions/validate";
import styles from "./catalog.module.css";

type Search = Promise<{ q?: string; source?: string; page?: string }>;
interface Row {
  song_id: string;
  title: string;
  artists: string[];
  versions: number;
}

const PAGE_SIZE = 30;

/**
 * The public catalog (R-02.9, R-02.10): songs with how many public versions each has, searched
 * by title, artist or album and filtered by source. Anyone may browse it (R-01.4). Which versions
 * count is decided in the database, never here (R-02.5).
 */
export default async function CatalogPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { q = "", source: chosen, page: pageText } = await searchParams;
  const query = q.trim().slice(0, 200);
  const source = (SOURCE_TYPES as readonly string[]).includes(chosen ?? "")
    ? (chosen as SourceType)
    : null;
  const page = Math.max(1, Math.floor(Number(pageText)) || 1);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalog", { query, source, page });
  const rows = (data ?? []) as Row[];
  const songs = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const t = await getTranslations("catalog");
  const sources = await getTranslations("version.source");

  const href = (changes: { source?: SourceType | null; page?: number }) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const nextSource = changes.source === undefined ? source : changes.source;
    if (nextSource) params.set("source", nextSource);
    const nextPage = changes.page ?? 1;
    if (nextPage > 1) params.set("page", String(nextPage));
    const text = params.toString();
    return text ? `/catalog?${text}` : "/catalog";
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <form className={styles.search} role="search">
        <label className={styles.field}>
          {t("search")}
          <input className={styles.input} name="q" type="search" defaultValue={query} />
        </label>
        {source && <input type="hidden" name="source" value={source} />}
        <Button type="submit">{t("submit")}</Button>
      </form>
      <nav aria-label={t("sources")} className={styles.filters}>
        {[null, ...SOURCE_TYPES].map((type) => (
          <Link
            key={type ?? "all"}
            href={href({ source: type })}
            className={styles.filter}
            aria-current={type === source ? "page" : undefined}
          >
            {type ? sources(type) : t("all")}
          </Link>
        ))}
      </nav>

      {error ? (
        <p role="alert" className={styles.message}>
          {t("error")}
        </p>
      ) : songs.length === 0 ? (
        <p className={styles.message}>{t("none")}</p>
      ) : (
        <ul className={styles.list} aria-label={t("results")}>
          {songs.map((song) => (
            <li key={song.song_id} className={styles.song}>
              <Link href={`/songs/${song.song_id}`} className={styles.songLink}>
                {song.title}
              </Link>
              {song.artists.length > 0 && (
                <span className={styles.meta}>{song.artists.join(", ")}</span>
              )}
              <span className={styles.count}>{t("versions", { count: song.versions })}</span>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav aria-label={t("pages")} className={styles.pages}>
          {page > 1 && (
            <Link href={href({ page: page - 1 })} className="cd-button cd-button--secondary">
              {t("previous")}
            </Link>
          )}
          {hasNext && (
            <Link href={href({ page: page + 1 })} className="cd-button cd-button--secondary">
              {t("next")}
            </Link>
          )}
        </nav>
      )}
      <Link href="/" className={styles.back}>
        {t("home")}
      </Link>
    </main>
  );
}
