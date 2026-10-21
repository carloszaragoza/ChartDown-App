import { keyName, parse, type Chart } from "chartdown";
import { readBeatsMode, type BeatsMode } from "@chartdown/ui";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { setSongKey } from "../../../../../lib/sets/lineup";
import { songView, viewAs, viewAsOptions, type SetSong } from "../../../../../lib/sets/song";
import { createClient } from "../../../../../lib/supabase/server";
import { StandIcon } from "../../../../_components/ActionIcons";
import { BeatsControl } from "../../../../_components/BeatsControl";
import { AudioButton } from "../../../../_components/AudioDock";
import { ChartControlsSlot } from "../../../../_components/ChartControlsSlot";
import { ChartPreview } from "../../../../_components/ChartPreview";
import { ViewOptions } from "../../../../_components/ViewOptions";
import { saveAudioStart } from "../../../../versions/[id]/audio";
import { setRecording } from "../../../../../lib/sets/recording";
import { LinkChoice } from "../../../../_components/LinkChoice";
import { UUID } from "../../../../versions/[id]/load";
import { updatePinned } from "../../../actions";
import { guessPhone } from "../../../../../lib/shell/guessPhone";

interface Revision {
  number: number;
  content: string;
}

/**
 * A song as this set plays it, for the person opening it (R-05.2, R-05.4, R-06.1 to R-06.4): its
 * pinned revision in the set's key, as numbers or letters, with the notes they may see. The
 * server (`set_song`) decides which band notes reach this device; nobody else's arrive. With
 * `?preview=new` the MD previews the author's newer revision before updating (decision 9.2).
 * Laid out as the version page (Design Handoff 2.0, the screens table: Song in a set).
 */
export default async function SetSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Promise<{ view?: string; beats?: string; preview?: string; as?: string }>;
}) {
  if (!authEnabled()) notFound();
  const { id, n } = await params;
  const position = Number(n);
  if (!UUID.test(id) || !Number.isInteger(position) || position < 1) notFound();
  const supabase = await createClient();
  const [{ data, error }, { count }] = await Promise.all([
    supabase.rpc("set_song", { set_id: id, song_position: position }),
    supabase.from("set_items").select("id", { count: "exact", head: true }).eq("set_id", id),
  ]);
  if (error || !data) notFound();
  const song = data as SetSong;
  const { view, beats: askedBeats, preview, as: asked } = await searchParams;
  // View as, for the MD and the set's temporary MD (R-06.3); nothing changes for a musician.
  const leads = song.role !== "musician";
  const as = leads && asked && /^[a-z0-9-]+$/.test(asked) ? asked : null;

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
  const shown = songView(chart, viewAs(song, as), (revisionId) => anchored.get(revisionId));
  const instruments = await getTranslations("instruments");
  const nameOf = (slug: string) =>
    instruments.has(slug as "keys") ? instruments(slug as "keys") : slug;
  const s = await getTranslations("stand");

  const homeKey = setSongKey(chart, song.set_key);
  const style = view === "letters" ? "letters" : "numbers";
  const beats = readBeatsMode(askedBeats);
  const t = await getTranslations("sets");
  const v = await getTranslations("viewer");
  const c = await getTranslations("chart");
  const path = `/sets/${song.set_id}/songs/${position}`;
  const total = count ?? position;
  const keep = style === "letters" ? "?view=letters" : "";
  // What the address says about the view: letters, and the Beats mode when it is not Auto.
  const viewing = (mode: BeatsMode, letters = style === "letters") =>
    [letters ? "view=letters" : "", mode === "auto" ? "" : `beats=${mode}`]
      .filter(Boolean)
      .join("&");
  const withPreview = (query: string) =>
    newer
      ? `${path}?${[query, "preview=new"].filter(Boolean).join("&")}`
      : `${path}${query ? `?${query}` : ""}`;
  const barLabel = (bar: number) => t("bar", { bar });
  const query = (params: Record<string, string>) => {
    const text = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value) as [string, string][],
    ).toString();
    return text ? `?${text}` : "";
  };

  const standHref = `${path}/stand${query({ view: style === "letters" ? "letters" : "", beats: beats === "auto" ? "" : beats, as: as ?? "" })}`;

  // The band's recording of this song, for its members (R-06.7, T-2603).
  const a = await getTranslations("audio");
  const recording = await setRecording(supabase, song.set_id, song.version_id, a("personal"));

  const phone = await guessPhone();
  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={1040}
      header={
        <LayoutHeader hasDivider>
          {/* The chart's metronome and View options at the header's end, on the actions' line;
              on a phone they wrap under the actions (owner's review, October 21, 2026). */}
          <HStack gap={4} vAlign="end" hAlign="between" wrap="wrap">
            <VStack gap={4}>
              <VStack gap={1}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href={`/sets/${song.set_id}`}>{song.set_name}</BreadcrumbItem>
                  <BreadcrumbItem>{t("songOf", { position, total })}</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>{song.title}</Heading>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Token label={`${c("key")} ${keyName(homeKey)}`} size="sm" />
                  {keyName(homeKey) !== keyName(chart.key) && (
                    <Text type="supporting">{c("writtenIn", { key: keyName(chart.key) })}</Text>
                  )}
                  <Token label={`${c("time")} ${chart.header.meter ?? "4/4"}`} size="sm" />
                </HStack>
                <Text color="secondary">
                  {t("by", { author: song.author_name })} ·{" "}
                  {t("revision", { number: revision.number })} ·{" "}
                  {!leads || as
                    ? t("notesForYou", { count: shown.forYou })
                    : song.role === "md"
                      ? t("allNotesMd")
                      : t("allNotesTempMd")}
                </Text>
                {recording && (
                  <HStack gap={1} vAlign="center">
                    <AudioButton
                      recording={recording}
                      chart={chart}
                      save={
                        leads
                          ? saveAudioStart.bind(null, recording.bandId, recording.versionId)
                          : undefined
                      }
                    />
                    <Text type="supporting">{a("bandRecording", { band: recording.band })}</Text>
                  </HStack>
                )}
              </VStack>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Button
                  label={t("previousSong")}
                  href={`/sets/${song.set_id}/songs/${position - 1}${keep}`}
                  isDisabled={position <= 1}
                />
                <Button
                  label={t("nextSong")}
                  href={`/sets/${song.set_id}/songs/${position + 1}${keep}`}
                  isDisabled={position >= total}
                />
                <Button
                  label={t("startStand")}
                  variant="primary"
                  href={standHref}
                  icon={<StandIcon />}
                />
              </HStack>
            </VStack>
            <ChartControlsSlot />
          </HStack>
        </LayoutHeader>
      }
      content={
        // The app's own area scrolls the chart, so the song form can stay pinned at its top.
        <LayoutContent isScrollable={false}>
          <VStack gap={5}>
            {newer && (
              <Banner
                status="info"
                title={t("previewing", { number: revision.number, pinned: song.revision_number })}
                endContent={
                  <form action={updatePinned}>
                    <input type="hidden" name="setId" value={song.set_id} />
                    <input type="hidden" name="itemId" value={song.item_id} />
                    <Button type="submit" variant="primary" label={t("update")} />
                  </form>
                }
              />
            )}
            {shown.unplaced.length > 0 && (
              <section aria-labelledby="unplaced">
                <VStack gap={2}>
                  <Heading level={2} id="unplaced">
                    {t("unplacedNotes")}
                  </Heading>
                  <List hasDividers edgeCompensation="inline">
                    {shown.unplaced.map(({ note }) => (
                      <Item key={note.id} as="li" label={note.text} description={note.section} />
                    ))}
                  </List>
                </VStack>
              </section>
            )}
            <ChartPreview
              phone={phone}
              chart={chart}
              style={style}
              homeKey={homeKey}
              isFramed
              hasForm
              hasControlsInHeader
              beats={beats}
              // Numbers / Letters, Beat marks and View as in one sheet beside the metronome, as on
              // the version page and in stand mode (T-2807).
              viewOptions={
                <ViewOptions>
                  <LinkChoice
                    phone={phone}
                    label={v("style")}
                    current={style}
                    options={(["numbers", "letters"] as const).map((option) => ({
                      value: option,
                      label: v(option),
                      href: withPreview(viewing(beats, option === "letters")),
                    }))}
                  />
                  <BeatsControl
                    value={beats}
                    hrefs={{
                      off: withPreview(viewing("off")),
                      auto: withPreview(viewing("auto")),
                      always: withPreview(viewing("always")),
                    }}
                    words={{
                      label: c("beatsLabel"),
                      name: c("beatsName"),
                      off: c("beatsOff"),
                      auto: c("beatsAuto"),
                      always: c("beatsAlways"),
                      help: { about: c("beatsAbout"), text: c("beatsHelp") },
                    }}
                  />
                  {leads && (
                    <LinkChoice
                      phone={phone}
                      label={s("viewAs")}
                      current={as ?? "all"}
                      options={[null, ...viewAsOptions(song, song.instruments)].map((option) => ({
                        value: option ?? "all",
                        label: option ? nameOf(option) : s("allNotes"),
                        href: `${path}${query({ view: style === "letters" ? "letters" : "", beats: beats === "auto" ? "" : beats, as: option ?? "" })}`,
                      }))}
                    />
                  )}
                </ViewOptions>
              }
              notes={chart.sections.map((_, index) =>
                (shown.sections[index] ?? []).map((note) => ({
                  md: note.md,
                  roles: note.roles,
                  passes: note.passes,
                  text: note.bar ? `${barLabel(note.bar)} · ${note.text}` : note.text,
                })),
              )}
            />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
