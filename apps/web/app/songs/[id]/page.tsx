import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import styles from "../../catalog/catalog.module.css";

interface Listed {
  id: string;
  author_name: string;
  status: "active" | "frozen" | "hidden";
  source_type: "studio" | "live" | "acoustic" | "own_arrangement";
  source_album: string | null;
  source_year: number | null;
}

/** A song and its public versions, to open one (R-02.9). Private versions never appear (R-02.5). */
export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: song }, { data }] = await Promise.all([
    supabase.from("songs").select("id, title, artists").eq("id", id).maybeSingle(),
    // The same rule as the catalog: public versions, active or frozen.
    supabase
      .from("versions")
      .select("id, author_name, status, source_type, source_album, source_year")
      .eq("song_id", id)
      .eq("visibility", "public")
      .in("status", ["active", "frozen"])
      .order("created_at"),
  ]);
  const versions = (data ?? []) as Listed[];
  if (!song || versions.length === 0) notFound();
  const t = await getTranslations("catalog");
  const v = await getTranslations("version");

  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.title}>{song.title}</h1>
        {song.artists.length > 0 && <p className={styles.meta}>{song.artists.join(", ")}</p>}
        <p className={styles.meta}>{t("versions", { count: versions.length })}</p>
      </div>
      <ul className={styles.list} aria-label={t("versionsOf", { title: song.title })}>
        {versions.map((version) => (
          <li key={version.id} className={styles.song}>
            <Link href={`/versions/${version.id}`} className={styles.songLink}>
              {v("by", { author: version.author_name })}
            </Link>
            <span className={styles.meta}>
              {[
                v(`source.${version.source_type}`),
                version.source_album && v("album", { album: version.source_album }),
                version.source_year && String(version.source_year),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {version.status === "frozen" && <span className={styles.badge}>{v("frozen")}</span>}
          </li>
        ))}
      </ul>
      <Link href="/catalog" className={styles.back}>
        {t("back")}
      </Link>
    </main>
  );
}
