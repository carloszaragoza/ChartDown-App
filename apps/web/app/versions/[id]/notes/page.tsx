import { parse, placeLayer, type Chart } from "@chartdown/core";
import { Button, type MDNoteData } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { NOTE_MAX, sectionAnchors, toLayer, type NoteRow } from "../../../../lib/versions/notes";
import { ChartBody } from "../ChartBody";
import { loadVersion, UUID } from "../load";
import { deleteNote, saveNote } from "./actions";
import styles from "./notes.module.css";

// The form's own errors; anything else reads as "could not be saved".
const NOTE_ERRORS = new Set(["section_required", "bar_invalid", "text_required", "text_too_long"]);

type Search = Promise<{
  band?: string;
  edit?: string;
  saved?: string;
  deleted?: string;
  error?: string;
}>;
interface MdBand {
  band_id: string;
  band: { name: string; is_personal: boolean } | { name: string; is_personal: boolean }[] | null;
}
interface CatalogInstrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  active: boolean;
}

/**
 * The band's MD layer on a version (R-03.5, R-06.6): the chart, read-only, with the band's notes
 * on it, and the form to add, edit or delete them. Only the band's MD sees this page.
 */
export default async function NotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  const search = await searchParams;
  const supabase = await createClient();
  const [version, { data: auth }] = await Promise.all([
    loadVersion(supabase, id),
    supabase.auth.getUser(),
  ]);
  if (!version?.currentRevisionId || !auth.user) notFound();

  // The bands where this person is the MD; their personal space first (R-04.7).
  const { data: memberships } = await supabase
    .from("band_members")
    .select("band_id, band:bands(name, is_personal)")
    .eq("user_id", auth.user.id)
    .eq("role", "md");
  const bands = ((memberships ?? []) as MdBand[])
    .map((row) => {
      const band = Array.isArray(row.band) ? row.band[0] : row.band;
      return { id: row.band_id, name: band?.name ?? "", personal: Boolean(band?.is_personal) };
    })
    .sort((a, b) => Number(b.personal) - Number(a.personal) || a.name.localeCompare(b.name));
  const band = bands.find((item) => item.id === search.band) ?? bands[0];
  if (!band) notFound();

  const [{ data: revision }, { data: layer }, { data: catalog }] = await Promise.all([
    supabase.from("revisions").select("content").eq("id", version.currentRevisionId).maybeSingle(),
    supabase
      .from("layers")
      .select("id")
      .eq("band_id", band.id)
      .eq("version_id", version.id)
      .maybeSingle(),
    supabase.from("instruments").select("id, slug, name_en, name_es, active"),
  ]);
  if (!revision) notFound();
  const { data: noteRows } = layer
    ? await supabase
        .from("layer_notes")
        .select(
          "id, section, occurrence, bar, text, anchored_revision_id, instruments:layer_note_instruments(instrument_id)",
        )
        .eq("layer_id", layer.id)
        .order("created_at")
    : { data: [] };
  const rows = (noteRows ?? []) as NoteRow[];

  // Each note is placed against the chart it was anchored to, so shifted sections are noticed.
  const earlier = [...new Set(rows.map((row) => row.anchored_revision_id))].filter(
    (revisionId) => revisionId !== version.currentRevisionId,
  );
  const { data: anchoredRows } = earlier.length
    ? await supabase.from("revisions").select("id, content").in("id", earlier)
    : { data: [] };
  const chart = parse(revision.content);
  const anchored = new Map<string, Chart>([[version.currentRevisionId, chart]]);
  for (const row of anchoredRows ?? [])
    anchored.set(row.id as string, parse(row.content as string));

  const instruments = (catalog ?? []) as CatalogInstrument[];
  const locale = await getLocale();
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const slugOf = new Map(instruments.map((instrument) => [instrument.id, instrument.slug]));
  const placement = placeLayer(
    chart,
    toLayer(rows, (instrumentId) => slugOf.get(instrumentId)),
    {
      anchoredChart: (revisionId) => anchored.get(revisionId),
    },
  );

  const t = await getTranslations("notes");
  const barLabel = (bar: number) => t("bar", { bar });
  const layerNotes = (index: number): MDNoteData[] =>
    (placement.sections[index] ?? []).map(({ note }) => ({
      md: true,
      roles: note.roles,
      text: note.bar ? `${barLabel(note.bar)} · ${note.text}` : note.text,
    }));
  const anchors = sectionAnchors(chart);
  const anchorLabel = (name: string, occurrence: number, count: number) =>
    count > 1 ? t("occurrence", { name, occurrence }) : name;
  const countOf = new Map(anchors.map((anchor) => [anchor.name.toLowerCase(), anchor.count]));
  const editing = rows.find((row) => row.id === search.edit && UUID.test(search.edit ?? ""));
  const editingIds = new Set(editing?.instruments.map((item) => item.instrument_id) ?? []);
  const offered = instruments
    .filter((instrument) => instrument.active || editingIds.has(instrument.id))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale));
  const nameById = new Map(instruments.map((instrument) => [instrument.id, nameOf(instrument)]));
  const unplacedIds = new Set(placement.unplaced.map((item) => item.note.id));
  const pageHref = (extra = "") => `/versions/${version.id}/notes?band=${band.id}${extra}`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{version.title}</h1>
          <p className={styles.meta}>
            {band.personal ? t("personal") : t("band", { band: band.name })} · {t("private")}
          </p>
        </div>
        <Link href={`/versions/${version.id}`} className="cd-button cd-button--secondary">
          {t("back")}
        </Link>
      </header>
      {bands.length > 1 && (
        <nav aria-label={t("bands")} className={styles.bands}>
          {bands.map((item) => (
            <Link
              key={item.id}
              href={`/versions/${version.id}/notes?band=${item.id}`}
              className={styles.choice}
              aria-current={item.id === band.id ? "true" : undefined}
            >
              {item.personal ? t("personal") : item.name}
            </Link>
          ))}
        </nav>
      )}
      {(search.saved || search.deleted) && (
        <p role="status" className={styles.message}>
          {search.saved ? t("saved") : t("deleted")}
        </p>
      )}
      {search.error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t(`errors.${NOTE_ERRORS.has(search.error) ? search.error : "unknown"}`)}
        </p>
      )}

      <div className={styles.panes}>
        <div className={styles.side}>
          <form action={saveNote} className={styles.form} id="note-form">
            <h2 className={styles.label}>{editing ? t("editTitle") : t("addTitle")}</h2>
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="bandId" value={band.id} />
            {editing && <input type="hidden" name="noteId" value={editing.id} />}
            <label className={styles.field}>
              {t("section")}
              <select
                name="anchor"
                required
                className={styles.input}
                defaultValue={editing ? `${editing.section}|${editing.occurrence}` : ""}
              >
                <option value="" disabled>
                  {t("chooseSection")}
                </option>
                {anchors.map((anchor) => (
                  <option key={anchor.value} value={anchor.value}>
                    {anchorLabel(anchor.name, anchor.occurrence, anchor.count)}
                  </option>
                ))}
                {editing &&
                  !anchors.some((a) => a.value === `${editing.section}|${editing.occurrence}`) && (
                    <option value={`${editing.section}|${editing.occurrence}`}>
                      {anchorLabel(editing.section, editing.occurrence, 2)}
                    </option>
                  )}
              </select>
            </label>
            <label className={styles.field}>
              {t("barField")}
              <input
                name="bar"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                className={styles.input}
                defaultValue={editing?.bar ?? ""}
              />
            </label>
            <fieldset className={styles.group}>
              <legend className={styles.label}>{t("for")}</legend>
              <p className={styles.hint}>{t("forHint")}</p>
              <div className={styles.instruments}>
                {offered.map((instrument) => (
                  <label key={instrument.id} className={styles.check}>
                    <input
                      type="checkbox"
                      name="instrument"
                      value={instrument.id}
                      defaultChecked={editingIds.has(instrument.id)}
                    />
                    {nameOf(instrument)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={styles.field}>
              <label htmlFor="note-text">{t("text")}</label>
              <input
                id="note-text"
                name="text"
                required
                maxLength={NOTE_MAX}
                className={styles.input}
                defaultValue={editing?.text ?? ""}
                autoComplete="off"
                aria-describedby="note-text-hint"
              />
              <span id="note-text-hint" className={styles.hint}>
                {t("textHint", { max: NOTE_MAX })}
              </span>
            </div>
            <div className={styles.buttons}>
              <Button type="submit" variant="primary">
                {editing ? t("saveEdit") : t("add")}
              </Button>
              {editing && (
                <Link href={pageHref()} className="cd-button cd-button--secondary">
                  {t("cancel")}
                </Link>
              )}
            </div>
          </form>

          <section aria-labelledby="layer-notes" className={styles.list}>
            <h2 id="layer-notes" className={styles.label}>
              {t("count", { count: rows.length })}
            </h2>
            <ul className={styles.items}>
              {rows.map((row) => {
                const names = row.instruments.map((item) => nameById.get(item.instrument_id) ?? "");
                return (
                  <li key={row.id} className={styles.item}>
                    <p className={styles.where}>
                      {anchorLabel(
                        row.section,
                        row.occurrence,
                        countOf.get(row.section.toLowerCase()) ?? 1,
                      )}
                      {row.bar ? ` · ${barLabel(row.bar)}` : ""}
                      {" · "}
                      {names.length > 0 ? names.join(", ") : t("everyone")}
                      {unplacedIds.has(row.id) && (
                        <>
                          {" "}
                          · <b>{t("unplaced")}</b>
                        </>
                      )}
                    </p>
                    <p className={styles.text}>{row.text}</p>
                    <div className={styles.buttons}>
                      <Link
                        href={pageHref(`&edit=${row.id}#note-form`)}
                        className="cd-button cd-button--secondary"
                        aria-label={t("editNote", { text: row.text })}
                      >
                        {t("edit")}
                      </Link>
                      <form action={deleteNote}>
                        <input type="hidden" name="versionId" value={version.id} />
                        <input type="hidden" name="bandId" value={band.id} />
                        <input type="hidden" name="noteId" value={row.id} />
                        <Button type="submit" aria-label={t("deleteNote", { text: row.text })}>
                          {t("delete")}
                        </Button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className={styles.preview} aria-label={t("preview")}>
          <ChartBody
            chart={chart}
            notes={(index) => [...(chart.sections[index]?.notes ?? []), ...layerNotes(index)]}
          />
        </section>
      </div>
    </main>
  );
}
