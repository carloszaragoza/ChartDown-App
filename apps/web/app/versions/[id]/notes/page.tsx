import { parse, placeLayer, type Chart } from "@chartdown/core";
import { Button, hasInstrumentIcon, Icon } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient } from "../../../../lib/supabase/server";
import { NOTE_MAX, sectionAnchors, toLayer, type NoteRow } from "../../../../lib/versions/notes";
import { loadVersion, UUID } from "../load";
import { deleteNote, saveNote, setAuthorNotes } from "./actions";
import { SectionView, type SectionNote } from "./SectionView";
import styles from "./notes.module.css";

// The form's own errors; anything else reads as "could not be saved".
const NOTE_ERRORS = new Set(["section_required", "bar_invalid", "text_required", "text_too_long"]);

type Search = Promise<{
  hidden?: string;
  shown?: string;
  band?: string;
  section?: string;
  note?: string;
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
      .select("id, hide_author_notes")
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
  const sources = await getTranslations("version.source");
  const sourceLabel = [sources(version.source.type), version.source.year].filter(Boolean).join(" ");
  const anchors = sectionAnchors(chart);
  const anchorLabel = (name: string, occurrence: number, count: number) =>
    count > 1 ? t("occurrence", { name, occurrence }) : name;
  const editing = rows.find((row) => row.id === search.edit && UUID.test(search.edit ?? ""));
  const editingIds = new Set(editing?.instruments.map((item) => item.instrument_id) ?? []);
  const offered = instruments
    .filter((instrument) => instrument.active || editingIds.has(instrument.id))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale));
  const hideAuthor = Boolean(layer?.hide_author_notes);
  const authorNotes = chart.sections.flatMap((section, index) =>
    section.notes.map((note, position) => ({
      key: `${index}-${position}`,
      section: section.name,
      note,
    })),
  );
  const pageHref = (extra = "") => `/versions/${version.id}/notes?band=${band.id}${extra}`;

  // The chosen section: the one asked for, the edited note's, or the first (design 06).
  const placedIndex = (noteId: string) =>
    placement.sections.findIndex((notes) => notes.some(({ note }) => note.id === noteId));
  const asked = Number(search.section);
  const justSaved = search.note && UUID.test(search.note) ? placedIndex(search.note) : -1;
  const chosen =
    editing && placedIndex(editing.id) >= 0
      ? placedIndex(editing.id)
      : justSaved >= 0
        ? justSaved
        : Number.isInteger(asked) && asked >= 0 && asked < chart.sections.length
          ? asked
          : 0;
  const notesIn = (index: number): SectionNote[] => [
    ...(hideAuthor ? [] : (chart.sections[index]?.notes ?? [])),
    ...(placement.sections[index] ?? []).map(({ note }) => ({
      md: true,
      roles: note.roles,
      text: note.bar ? `${barLabel(note.bar)} · ${note.text}` : note.text,
      editHref: pageHref(`&edit=${note.id}#note-form`),
      editLabel: t("editNote", { text: note.text }),
    })),
  ];
  const chosenAnchor = anchors[chosen];
  const formAnchor = editing
    ? `${editing.section}|${editing.occurrence}`
    : (chosenAnchor?.value ?? "");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.meta}>
            {band.personal ? t("personal") : t("band", { band: band.name })} · {t("mdNotes")}
          </p>
          <h1 className={styles.title}>
            {version.title}
            {sourceLabel ? ` · ${sourceLabel}` : ""}
          </h1>
          <p className={styles.hint}>
            {band.personal ? t("privatePersonal") : t("privateBand", { band: band.name })}
          </p>
        </div>
        <div className={styles.headerTools}>
          {authorNotes.length > 0 && (
            <form action={setAuthorNotes}>
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="bandId" value={band.id} />
              <input type="hidden" name="hide" value={hideAuthor ? "0" : "1"} />
              <input type="hidden" name="section" value={chosen} />
              <button type="submit" className={styles.toggle} aria-pressed={hideAuthor}>
                <span className={styles.box} aria-hidden="true">
                  {hideAuthor && <Icon name="check" size={16} />}
                </span>
                {t("hideAuthorShort")}
              </button>
            </form>
          )}
          <Link href={`/versions/${version.id}`} className="cd-button cd-button--secondary">
            {t("back")}
          </Link>
        </div>
      </div>
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
      {(search.saved || search.deleted || search.hidden || search.shown) && (
        <p role="status" className={styles.message}>
          {search.saved
            ? t("saved")
            : search.deleted
              ? t("deleted")
              : search.hidden
                ? t("authorHidden")
                : t("authorShown")}
        </p>
      )}
      {search.error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t(`errors.${NOTE_ERRORS.has(search.error) ? search.error : "unknown"}`)}
        </p>
      )}

      {placement.unplaced.length > 0 && (
        <section aria-labelledby="unplaced-notes" className={styles.attention}>
          <h2 id="unplaced-notes" className={styles.label}>
            {t("unplacedTitle", { count: placement.unplaced.length })}
          </h2>
          <p className={styles.hint}>{t("unplacedHint")}</p>
          <ul className={styles.items}>
            {placement.unplaced.map(({ note, reason }) => (
              <li key={note.id} className={styles.item}>
                <p className={styles.where}>
                  {reason === "bar"
                    ? t("noBar", { section: note.section, bar: note.bar ?? 0 })
                    : t("noSection", { section: note.section })}
                </p>
                <p className={styles.text}>{note.text}</p>
                <Link
                  href={pageHref(`&edit=${note.id}#note-form`)}
                  className="cd-button cd-button--secondary"
                  aria-label={t("anchorNote", { text: note.text })}
                >
                  {t("anchor")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.layerPanes}>
        <nav aria-label={t("sections")} className={styles.sectionList}>
          {anchors.map((anchor, index) => (
            <Link
              key={anchor.value}
              href={pageHref(`&section=${index}`)}
              className={styles.sectionLink}
              aria-current={index === chosen && !editing ? "true" : undefined}
            >
              <span>{anchorLabel(anchor.name, anchor.occurrence, anchor.count)}</span>
              <span className={styles.noteCount}>
                {t("noteCount", { count: notesIn(index).length })}
              </span>
            </Link>
          ))}
        </nav>

        <SectionView chart={chart} index={chosen} notes={notesIn(chosen)}>
          <form
            // A fresh form for each note, so no value carries over between adding and editing,
            // nor from one added note to the next.
            key={editing?.id ?? `new-${rows.length}`}
            action={saveNote}
            className={styles.noteForm}
            id="note-form"
          >
            <h3 className={styles.label}>
              {editing
                ? t("editTitle")
                : t("addTo", {
                    section: chosenAnchor
                      ? anchorLabel(chosenAnchor.name, chosenAnchor.occurrence, chosenAnchor.count)
                      : "",
                  })}
            </h3>
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="bandId" value={band.id} />
            {editing && <input type="hidden" name="noteId" value={editing.id} />}
            <input type="hidden" name="section" value={chosen} />
            {editing ? (
              // Editing may move a note to another section, as anchoring it again does.
              <label className={styles.field}>
                {t("section")}
                <select name="anchor" required className={styles.input} defaultValue={formAnchor}>
                  {anchors.map((anchor) => (
                    <option key={anchor.value} value={anchor.value}>
                      {anchorLabel(anchor.name, anchor.occurrence, anchor.count)}
                    </option>
                  ))}
                  {!anchors.some((a) => a.value === formAnchor) && (
                    <option value={formAnchor}>
                      {anchorLabel(editing.section, editing.occurrence, 2)}
                    </option>
                  )}
                </select>
              </label>
            ) : (
              <input type="hidden" name="anchor" value={formAnchor} />
            )}
            <fieldset className={styles.group}>
              <legend className={styles.label}>{t("for")}</legend>
              <div className={styles.chips}>
                <span className={styles.chipEveryone}>{t("everyone")}</span>
                {offered.map((instrument) => (
                  <label key={instrument.id} className={styles.chip}>
                    <input
                      type="checkbox"
                      name="instrument"
                      value={instrument.id}
                      defaultChecked={editingIds.has(instrument.id)}
                    />
                    {hasInstrumentIcon(instrument.slug) && (
                      <Icon name={instrument.slug} size={18} />
                    )}
                    {nameOf(instrument)}
                  </label>
                ))}
              </div>
              <p className={styles.hint}>{t("forHint")}</p>
            </fieldset>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="note-text">{t("text")}</label>
                <input
                  id="note-text"
                  name="text"
                  required
                  maxLength={NOTE_MAX}
                  className={styles.input}
                  defaultValue={editing?.text ?? ""}
                  placeholder={t("textPlaceholder")}
                  autoComplete="off"
                  aria-describedby="note-text-hint"
                />
                <span id="note-text-hint" className={styles.hint}>
                  {t("textHint", { max: NOTE_MAX })}
                </span>
              </div>
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
            </div>
            <div className={styles.buttons}>
              <Button
                type="submit"
                variant="primary"
                {...(editing ? {} : { icon: "add" as const })}
              >
                {editing ? t("saveEdit") : t("add")}
              </Button>
              {editing && (
                <Link href={pageHref()} className="cd-button cd-button--secondary">
                  {t("cancel")}
                </Link>
              )}
            </div>
          </form>
          {editing && (
            <form action={deleteNote}>
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="bandId" value={band.id} />
              <input type="hidden" name="noteId" value={editing.id} />
              <input type="hidden" name="section" value={chosen} />
              <Button type="submit" aria-label={t("deleteNote", { text: editing.text })}>
                {t("delete")}
              </Button>
            </form>
          )}
        </SectionView>
      </div>
    </main>
  );
}
