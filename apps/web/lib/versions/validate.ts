/** The sources a version may have (R-02.2), in the order the form offers them. */
export const SOURCE_TYPES = ["studio", "live", "acoustic", "own_arrangement"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** What the person typed, kept so a refused form comes back as they left it. */
export interface VersionValues {
  songId: string;
  title: string;
  artists: string;
  author: string;
  content: string;
  sourceType: string;
  album: string;
  year: string;
  youtube: string;
}

export type VersionError =
  | "source_required"
  | "title_required"
  | "author_required"
  | "chart_required"
  | "year_invalid"
  | "youtube_invalid"
  | "unknown";

/** What create_version receives (Technical Plan, "Create a version"). */
export interface VersionInput {
  song_id: string | null;
  new_title: string | null;
  new_artists: string[] | null;
  author_name: string;
  content: string;
  source_type: SourceType;
  source_album: string | null;
  source_year: number | null;
  source_youtube_url: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The same rule as the database's check on versions.source_youtube_url.
const YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//;

export function readVersionForm(form: FormData): VersionValues {
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    songId: text("songId"),
    title: text("title"),
    artists: text("artists"),
    author: text("author"),
    content: text("content"),
    sourceType: text("sourceType"),
    album: text("album"),
    year: text("year"),
    youtube: text("youtube"),
  };
}

/**
 * Checks a new version before it is sent (R-02.1, R-02.2). The database checks the same rules;
 * this only says what is wrong in words. Parser warnings never stop a save (T-601 shows them).
 */
export function validateVersion(
  values: VersionValues,
): { error: VersionError } | { input: VersionInput } {
  const existing = UUID.test(values.songId) ? values.songId : null;
  const title = values.title.trim();
  if (!existing && (title.length < 1 || title.length > 200)) return { error: "title_required" };
  const author = values.author.trim();
  if (author.length < 1 || author.length > 80) return { error: "author_required" };
  if (values.content.trim().length === 0) return { error: "chart_required" };
  if (!(SOURCE_TYPES as readonly string[]).includes(values.sourceType))
    return { error: "source_required" };
  const yearText = values.year.trim();
  const year = yearText === "" ? null : Number(yearText);
  if (year !== null && (!Number.isInteger(year) || year < 1800 || year > 2200))
    return { error: "year_invalid" };
  const youtube = values.youtube.trim();
  if (youtube !== "" && !YOUTUBE.test(youtube)) return { error: "youtube_invalid" };
  const album = values.album.trim().slice(0, 200);
  return {
    input: {
      song_id: existing,
      new_title: existing ? null : title,
      new_artists: existing
        ? null
        : values.artists
            .split(",")
            .map((artist) => artist.trim())
            .filter(Boolean),
      author_name: author,
      content: values.content,
      source_type: values.sourceType as SourceType,
      source_album: album || null,
      source_year: year,
      source_youtube_url: youtube || null,
    },
  };
}
