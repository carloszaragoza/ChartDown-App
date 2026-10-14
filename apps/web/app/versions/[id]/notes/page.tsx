import { parse, placeLayer, type Chart } from "chartdown";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { createClient, readUser } from "../../../../lib/supabase/server";
import { NOTE_MAX, sectionAnchors, toLayer, type NoteRow } from "../../../../lib/versions/notes";
import { loadVersion, UUID } from "../load";
import { deleteNote } from "./actions";
import { NoteForm } from "./NoteForm";
import { BandChoice, HideAuthorSwitch } from "./NotesControls";
import { SectionView, type SectionNote } from "./SectionView";

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
 * The band's MD layer on a version (R-03.5, R-06.6; Design Handoff 2.0 screen 07): the sections in
 * a panel with their note counts; the chosen one, read-only, with the band's notes on it and the
 * form to add, edit or delete them. Only the band's MD sees this page.
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
    readUser(supabase),
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
          "id, section, occurrence, bar, text, passes, anchored_revision_id, instruments:layer_note_instruments(instrument_id)",
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
      ...(note.passes ? { passes: note.passes } : {}),
      text: note.bar ? `${barLabel(note.bar)} · ${note.text}` : note.text,
      editHref: pageHref(`&edit=${note.id}#note-form`),
      editLabel: t("editNote", { text: note.text }),
    })),
  ];
  const chosenAnchor = anchors[chosen];
  const formAnchor = editing
    ? `${editing.section}|${editing.occurrence}`
    : (chosenAnchor?.value ?? "");

  const message =
    search.saved || search.deleted || search.hidden || search.shown
      ? search.saved
        ? t("saved")
        : search.deleted
          ? t("deleted")
          : search.hidden
            ? t("authorHidden")
            : t("authorShown")
      : null;

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">
                {band.personal ? t("personal") : t("band", { band: band.name })} · {t("mdNotes")}
              </Text>
              <Heading level={1}>
                {version.title}
                {sourceLabel ? ` · ${sourceLabel}` : ""}
              </Heading>
              <Text color="secondary">
                {band.personal ? t("privatePersonal") : t("privateBand", { band: band.name })}
              </Text>
            </VStack>
            <HStack gap={3} vAlign="center" wrap="wrap">
              {authorNotes.length > 0 && (
                <HideAuthorSwitch
                  versionId={version.id}
                  bandId={band.id}
                  section={chosen}
                  hidden={hideAuthor}
                  label={t("hideAuthorShort")}
                />
              )}
              <Button label={t("back")} href={`/versions/${version.id}`} />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      start={
        <LayoutPanel width={260} hasDivider padding={2} label={t("sections")}>
          <nav aria-label={t("sections")}>
            <List>
              {anchors.map((anchor, index) => (
                <Item
                  key={anchor.value}
                  as="li"
                  href={pageHref(`&section=${index}`)}
                  isSelected={index === chosen && !editing}
                  label={anchorLabel(anchor.name, anchor.occurrence, anchor.count)}
                  endContent={
                    <Text type="supporting">
                      {t("noteCount", { count: notesIn(index).length })}
                    </Text>
                  }
                />
              ))}
            </List>
          </nav>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={8}>
          <VStack gap={5}>
            {bands.length > 1 && (
              <BandChoice
                label={t("bands")}
                current={band.id}
                bands={bands.map((item) => ({
                  id: item.id,
                  name: item.personal ? t("personal") : item.name,
                  href: `/versions/${version.id}/notes?band=${item.id}`,
                }))}
              />
            )}
            {message && <Banner status="success" title={message} />}
            {search.error && (
              <Banner
                status="error"
                title={t(`errors.${NOTE_ERRORS.has(search.error) ? search.error : "unknown"}`)}
              />
            )}

            {placement.unplaced.length > 0 && (
              <section aria-labelledby="unplaced-notes">
                <VStack gap={2}>
                  <Heading level={2} id="unplaced-notes">
                    {t("unplacedTitle", { count: placement.unplaced.length })}
                  </Heading>
                  <Text color="secondary">{t("unplacedHint")}</Text>
                  <List hasDividers edgeCompensation="inline">
                    {placement.unplaced.map(({ note, reason }) => (
                      <Item
                        key={note.id}
                        as="li"
                        label={note.text}
                        description={
                          reason === "bar"
                            ? t("noBar", { section: note.section, bar: note.bar ?? 0 })
                            : t("noSection", { section: note.section })
                        }
                        endContent={
                          <Button
                            label={t("anchorNote", { text: note.text })}
                            href={pageHref(`&edit=${note.id}#note-form`)}
                          >
                            {t("anchor")}
                          </Button>
                        }
                      />
                    ))}
                  </List>
                </VStack>
              </section>
            )}

            <SectionView chart={chart} index={chosen} notes={notesIn(chosen)}>
              <NoteForm
                // A fresh form for each note, so no value carries over between adding and
                // editing, nor from one added note to the next.
                key={editing?.id ?? `new-${rows.length}`}
                versionId={version.id}
                bandId={band.id}
                section={chosen}
                anchor={formAnchor}
                anchors={[
                  ...anchors.map((anchor) => ({
                    value: anchor.value,
                    label: anchorLabel(anchor.name, anchor.occurrence, anchor.count),
                  })),
                  ...(editing && !anchors.some((anchor) => anchor.value === formAnchor)
                    ? [
                        {
                          value: formAnchor,
                          label: anchorLabel(editing.section, editing.occurrence, 2),
                        },
                      ]
                    : []),
                ]}
                instruments={offered.map((instrument) => ({
                  id: instrument.id,
                  name: nameOf(instrument),
                }))}
                editing={
                  editing
                    ? {
                        id: editing.id,
                        text: editing.text,
                        bar: editing.bar,
                        instrumentIds: [...editingIds],
                        passes: (editing.passes ?? []).join(","),
                      }
                    : null
                }
                cancelHref={pageHref()}
                words={{
                  title: editing
                    ? t("editTitle")
                    : t("addTo", {
                        section: chosenAnchor
                          ? anchorLabel(
                              chosenAnchor.name,
                              chosenAnchor.occurrence,
                              chosenAnchor.count,
                            )
                          : "",
                      }),
                  section: t("section"),
                  for: t("for"),
                  forHint: t("forHint"),
                  text: t("text"),
                  textPlaceholder: t("textPlaceholder"),
                  textHint: t("textHint", { max: NOTE_MAX }),
                  bar: t("barField"),
                  passes: t("passesField"),
                  passesHint: t("passesHint"),
                  submit: editing ? t("saveEdit") : t("add"),
                  cancel: t("cancel"),
                }}
              />
              {editing && (
                <form action={deleteNote}>
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="bandId" value={band.id} />
                  <input type="hidden" name="noteId" value={editing.id} />
                  <input type="hidden" name="section" value={chosen} />
                  <Button
                    type="submit"
                    variant="destructive"
                    label={t("deleteNote", { text: editing.text })}
                  >
                    {t("delete")}
                  </Button>
                </form>
              )}
            </SectionView>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
