import { keyName, parse } from "@chartdown/core";
import { Button, Icon } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../lib/auth/enabled";
import { createClient } from "../../lib/supabase/server";
import { SOURCE_TYPES, type SourceType } from "../../lib/versions/validate";
import { forkVersion } from "../versions/[id]/actions";
import styles from "./catalog.module.css";

type Search = Promise<{ q?: string; source?: string; page?: string }>;
interface Row {
  song_id: string;
  title: string;
  artists: string[];
  versions: number;
}
interface Listed {
  id: string;
  song_id: string;
  owner_id: string | null;
  author_name: string;
  status: "active" | "frozen" | "hidden";
  source_type: SourceType;
  source_album: string | null;
  source_year: number | null;
  source_youtube_url: string | null;
  current_revision_id: string | null;
}

const PAGE_SIZE = 30;

/**
 * The public catalog (R-02.9, R-02.10), as `design/screens/04-catalog.html` draws it (T-707):
 * songs with how many public versions each has, searched by title, artist or album and filtered
 * by source; each song opens in place to list its versions, to open or fork. Anyone may browse
 * it (R-01.4). Which versions count is decided in the database, never here (R-02.5).
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
  const [{ data, error }, { data: auth }] = await Promise.all([
    supabase.rpc("catalog", { query, source, page }),
    supabase.auth.getUser(),
  ]);
  const rows = (data ?? []) as Row[];
  const songs = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  // The versions of the songs on this page, with the rule of the catalog: public, active or
  // frozen, and of the chosen source.
  let versionQuery = supabase
    .from("versions")
    .select(
      "id, song_id, owner_id, author_name, status, source_type, source_album, source_year, source_youtube_url, current_revision_id",
    )
    .in(
      "song_id",
      songs.map((song) => song.song_id),
    )
    .eq("visibility", "public")
    .in("status", ["active", "frozen"])
    .order("created_at");
  if (source) versionQuery = versionQuery.eq("source_type", source);
  const { data: versionRows } = songs.length ? await versionQuery : { data: [] };
  const versions = (versionRows ?? []) as Listed[];
  // Key and meter come from each version's current revision.
  const currentIds = versions
    .map((version) => version.current_revision_id)
    .filter((id): id is string => Boolean(id));
  const { data: revisions } = currentIds.length
    ? await supabase.from("revisions").select("id, content").in("id", currentIds)
    : { data: [] };
  const charts = new Map(
    (revisions ?? []).map((revision) => {
      const chart = parse(revision.content as string);
      return [
        revision.id as string,
        { key: keyName(chart.key), meter: chart.header.meter ?? "4/4" },
      ];
    }),
  );

  const t = await getTranslations("catalog");
  const sources = await getTranslations("version.source");
  const v = await getTranslations("version");
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.meta}>{t("intro")}</p>
        </div>
        <Link href="/versions/new" className="cd-button cd-button--primary">
          <Icon name="add" size={20} />
          {t("newVersion")}
        </Link>
      </div>
      <form className={styles.search} role="search">
        <label className={styles.searchField}>
          <Icon name="search" size={20} />
          <input
            className={styles.searchInput}
            name="q"
            type="search"
            defaultValue={query}
            placeholder={t("placeholder")}
            aria-label={t("search")}
          />
        </label>
        {source && <input type="hidden" name="source" value={source} />}
        {/* Enter searches; the button is for those who prefer it. */}
        <Button type="submit" className={styles.searchButton}>
          {t("submit")}
        </Button>
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
          {songs.map((song) => {
            const own = versions.filter((version) => version.song_id === song.song_id);
            return (
              <li key={song.song_id} className={styles.card}>
                <details open={songs.length === 1}>
                  <summary className={styles.summary}>
                    <span className={styles.songText}>
                      <span className={styles.songTitle}>{song.title}</span>
                      {song.artists.length > 0 && (
                        <span className={styles.meta}>{song.artists.join(", ")}</span>
                      )}
                    </span>
                    <span className={styles.count}>{t("versions", { count: song.versions })}</span>
                  </summary>
                  <ul
                    className={styles.versions}
                    aria-label={t("versionsOf", { title: song.title })}
                  >
                    {own.map((version) => {
                      const chart = version.current_revision_id
                        ? charts.get(version.current_revision_id)
                        : undefined;
                      const signedIn = Boolean(auth.user);
                      const mine = signedIn && auth.user?.id === version.owner_id;
                      return (
                        <li key={version.id} className={styles.version}>
                          <span className={styles.tag}>
                            {[sources(version.source_type), version.source_year]
                              .filter(Boolean)
                              .join(" ")}
                          </span>
                          <span className={styles.songText}>
                            <span className={styles.versionTitle}>
                              {version.source_album
                                ? v("album", { album: version.source_album })
                                : version.source_youtube_url
                                  ? v("youtube")
                                  : sources(version.source_type)}
                            </span>
                            <span className={styles.meta}>
                              {[
                                t("by", { author: version.author_name }),
                                chart && `${t("key")} ${chart.key}`,
                                chart?.meter,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className={styles.public}>
                            <Icon name="public" size={16} />
                            {version.status === "frozen" ? v("frozen") : t("public")}
                          </span>
                          <Link
                            href={`/versions/${version.id}`}
                            className="cd-button cd-button--secondary"
                            aria-label={t("openName", {
                              title: song.title,
                              author: version.author_name,
                            })}
                          >
                            {t("open")}
                          </Link>
                          {!mine &&
                            (signedIn ? (
                              <form action={forkVersion}>
                                <input type="hidden" name="versionId" value={version.id} />
                                <Button
                                  type="submit"
                                  icon="fork"
                                  aria-label={t("forkName", {
                                    title: song.title,
                                    author: version.author_name,
                                  })}
                                >
                                  {t("fork")}
                                </Button>
                              </form>
                            ) : (
                              <Link
                                href={`/auth/sign-in?next=${encodeURIComponent(`/versions/${version.id}`)}`}
                                className="cd-button cd-button--secondary"
                              >
                                <Icon name="fork" size={20} />
                                {t("fork")}
                              </Link>
                            ))}
                        </li>
                      );
                    })}
                  </ul>
                  <Link href={`/songs/${song.song_id}`} className={styles.songLink}>
                    {t("songPage", { title: song.title })}
                  </Link>
                </details>
              </li>
            );
          })}
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
    </main>
  );
}
