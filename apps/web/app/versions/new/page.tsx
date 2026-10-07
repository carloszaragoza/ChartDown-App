import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import styles from "./new.module.css";
import { VersionForm } from "./VersionForm";

type Search = Promise<{ q?: string; song?: string }>;
interface Song {
  id: string;
  title: string;
  artists: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Typed text is matched literally, never as a pattern.
const literal = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

/**
 * A new version in two steps (R-02.1): find the song, or start a new one; then the chart and its
 * source. Creating asks a visitor to sign in first (R-01.4).
 */
export default async function NewVersionPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { q = "", song: chosen } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=/versions/new");
  const t = await getTranslations("newVersion");

  if (chosen === "new" || (chosen && UUID.test(chosen))) {
    const [{ data: profile }, { data: song }] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", auth.user.id).maybeSingle(),
      chosen === "new"
        ? Promise.resolve({ data: null })
        : supabase.from("songs").select("id, title, artists").eq("id", chosen).maybeSingle(),
    ]);
    if (chosen !== "new" && !song) notFound();
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t("title")}</h1>
        <VersionForm
          song={(song as Song | null) ?? null}
          defaultTitle={q.trim()}
          defaultAuthor={profile?.name ?? ""}
        />
        <Link href="/versions/new" className={styles.back}>
          {t("changeSong")}
        </Link>
      </div>
    );
  }

  const query = q.trim().slice(0, 200);
  const { data: found } = query
    ? await supabase
        .from("songs")
        .select("id, title, artists")
        .ilike("title", `%${literal(query)}%`)
        .order("title")
        .limit(20)
    : { data: null };
  const results = (found ?? []) as Song[];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <form className={styles.search} role="search">
        <label className={styles.field}>
          {t("search.label")}
          <input className={styles.input} name="q" type="search" defaultValue={query} />
        </label>
        <Button type="submit">{t("search.submit")}</Button>
      </form>
      {query && (
        <section aria-labelledby="results-title" className={styles.results}>
          <h2 id="results-title" className={styles.legend}>
            {t("search.results")}
          </h2>
          {results.length === 0 ? (
            <p className={styles.hint}>{t("search.none")}</p>
          ) : (
            <ul className={styles.list}>
              {results.map((result) => (
                <li key={result.id} className={styles.song}>
                  <span>
                    <span className={styles.songTitle}>{result.title}</span>
                    {result.artists.length > 0 && (
                      <span className={styles.hint}> · {result.artists.join(", ")}</span>
                    )}
                  </span>
                  <Link
                    href={`/versions/new?song=${result.id}`}
                    className="cd-button cd-button--secondary"
                    aria-label={t("search.use", { title: result.title })}
                  >
                    {t("search.useShort")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Link
        href={
          query ? `/versions/new?song=new&q=${encodeURIComponent(query)}` : "/versions/new?song=new"
        }
        className="cd-button cd-button--primary"
      >
        {t("search.newSong")}
      </Link>
      <Link href="/" className={styles.back}>
        {t("back")}
      </Link>
    </div>
  );
}
