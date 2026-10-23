"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Item } from "@astryxdesign/core/Item";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { parse, SUPPORTED_VERSION, type Warning } from "chartdown";
import { ClockIcon, GlobeAltIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChartTextArea, type ChartTextAreaHandle } from "../../../_components/ChartTextArea";
import { ChartPreview } from "../../../_components/ChartPreview";
import { saveChart, type SaveState, type SourceValues } from "./actions";
import { SOURCE_TYPES, type VersionError } from "../../../../lib/versions/validate";
import { videoId } from "../../../../lib/video/youtube";
import { saveVideoPoints } from "../actions";
import { CancelButton, WriteLayout } from "../../../_components/WriteLayout";
import { VideoLink } from "../../../_components/VideoDock";
import { BandAudio, type BandRecording } from "../BandAudio";
import { usePlayingSection } from "../../../_components/usePlaybackBar";
import { splitTitle, withTitle } from "../../../../lib/versions/title";

export interface EditorProps {
  /** The server's guess that the page opens on a phone (R-03.9). */
  phone: boolean;
  versionId: string;
  title: string;
  visibility: "public" | "private";
  revisionId: string;
  content: string;
  /** The version's source, as the header shows it ("Own arrangement", "Live 2025"). */
  source: string;
  revisionNumber: number;
  /** When the current revision was saved (ISO). */
  savedAt: string;
  /** The song's details, shown at the top (T-2404). */
  details?: {
    artists: string[];
    author: string;
    /** The source's type as saved, for its choice (T-2408). */
    sourceType: string;
    album: string | null;
    year: number | null;
    youtube: string | null;
    /** Where the music starts in the video, in seconds, as saved (R-03.11). */
    videoStart?: number | null;
    videoEnd?: number | null;
  };
  /** The bands' recordings of this version, to write along with as with the video (T-2834). */
  recordings?: BandRecording[];
}

/**
 * The chart editor (R-03.1; T-2404): the song's details at the top, the text on the left as tall
 * as the screen and a live preview beside it that follows the typing without reloading, with the
 * parser's warnings and their lines. The title is written once, in the header: the text leaves
 * out its `title:` line and saving puts it back. The version's source is a form the owner can
 * change, saved with the chart (R-02.2, T-2408). Warnings never block a save; a save returns to
 * the version, and Cancel goes back to it.
 */
export function Editor({
  phone,
  versionId,
  title,
  visibility,
  revisionId,
  content,
  source,
  revisionNumber,
  savedAt,
  details,
  recordings = [],
}: EditorProps) {
  const t = useTranslations("editor");
  const v = useTranslations("version");
  const n = useTranslations("newVersion");
  const sources = useTranslations("version.source");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const router = useRouter();
  const [text, setText] = useState(() => splitTitle(content).body);
  const initialSource: SourceValues = {
    sourceType: details?.sourceType ?? "",
    album: details?.album ?? "",
    year: details?.year ? String(details.year) : "",
    youtube: details?.youtube ?? "",
  };
  const [state, action, pending] = useActionState<SaveState, FormData>(saveChart, {
    status: "idle",
    baseRevisionId: revisionId,
    savedContent: content,
    savedSource: initialSource,
  });
  const [sourceType, setSourceType] = useState(initialSource.sourceType);
  const [album, setAlbum] = useState(initialSource.album);
  const [year, setYear] = useState(initialSource.year);
  const [youtube, setYoutube] = useState(initialSource.youtube);
  const saved = state.savedSource;
  const dirty =
    text !== splitTitle(state.savedContent).body ||
    sourceType !== saved.sourceType ||
    album.trim() !== saved.album.trim() ||
    year.trim() !== saved.year.trim() ||
    youtube.trim() !== saved.youtube.trim();
  const fieldError = (code: VersionError) =>
    state.status === "invalid" && state.error === code
      ? { status: { type: "error" as const, message: n(`errors.${code}`) } }
      : {};
  // The preview may lag a keystroke behind so typing never waits for it.
  const shown = useDeferredValue(text);
  const chart = useMemo(() => parse(withTitle(shown, title)), [shown, title]);
  // The warnings name the lines of the text on screen, which has no title line, and so does the
  // heading of the section the player is in (T-2838).
  const onScreen = useMemo(() => parse(shown), [shown]);
  const warnings = onScreen.warnings;
  const playingSection = usePlayingSection(chart);
  const playingLine = playingSection !== null ? onScreen.sections[playingSection]?.line : undefined;
  const lines = useRef<ChartTextAreaHandle>(null);
  const page = `/versions/${versionId}`;

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // A save returns to the version, saying the new revision when the chart changed.
  useEffect(() => {
    if (state.status !== "saved") return;
    router.push(state.baseRevisionId !== revisionId ? `${page}?saved=${state.number ?? ""}` : page);
  }, [state, router, page, revisionId]);

  const goTo = (line: number) => lines.current?.goTo(line);
  return (
    <WriteLayout
      phone={phone}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">
                {t("savedLine", {
                  source,
                  number: state.number ?? revisionNumber,
                  when: format.relativeTime(new Date(state.savedAt ?? savedAt), now),
                })}
              </Text>
              <Heading level={1}>{title}</Heading>
              {details && details.artists.length > 0 && (
                <Text color="secondary">{details.artists.join(", ")}</Text>
              )}
            </VStack>
            <form action={action}>
              <input type="hidden" name="versionId" value={versionId} />
              <input type="hidden" name="content" value={withTitle(text, title)} />
              <input type="hidden" name="sourceType" value={sourceType} />
              <input type="hidden" name="album" value={album} />
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="youtube" value={youtube} />
              <HStack gap={2} vAlign="center" wrap="wrap">
                {/* Going private is its own flow (R-02.4), with no way back. */}
                <SegmentedControl
                  label={t("visibility")}
                  value={visibility}
                  isDisabled={visibility === "private"}
                  disabledMessage={t("privateForGood")}
                  onChange={(value) => {
                    if (value === "private") router.push(`/versions/${versionId}/make-private`);
                  }}
                >
                  <SegmentedControlItem
                    value="public"
                    label={t("public")}
                    icon={<Icon icon={GlobeAltIcon} />}
                  />
                  <SegmentedControlItem
                    value="private"
                    label={v("private")}
                    icon={<Icon icon={LockClosedIcon} />}
                  />
                </SegmentedControl>
                <Button
                  label={v("history")}
                  href={`/versions/${versionId}/history`}
                  icon={<Icon icon={ClockIcon} />}
                />
                <CancelButton href={page} dirty={dirty} />
                <Button
                  type="submit"
                  variant="primary"
                  label={t("save")}
                  isLoading={pending}
                  isDisabled={!dirty}
                  {...(!dirty ? { tooltip: t("noChanges") } : {})}
                />
              </HStack>
            </form>
          </HStack>
        </LayoutHeader>
      }
      detailsLabel={n("details")}
      details={
        <VStack gap={4}>
          {state.status === "invalid" && state.error && (
            <div role="alert">
              <Banner status="error" title={n(`errors.${state.error}`)} />
            </div>
          )}
          <Grid columns={{ minWidth: 220 }} gap={4} align="start">
            {details && (
              <VStack gap={0.5}>
                <Text type="supporting">{n("author")}</Text>
                <Text weight="semibold">{details.author}</Text>
              </VStack>
            )}
            <TextInput label={n("album")} value={album} onChange={setAlbum} isOptional />
            <TextInput
              label={n("year")}
              value={year}
              onChange={setYear}
              isOptional
              {...fieldError("year_invalid")}
            />
            <HStack gap={1} vAlign="end">
              {videoId(youtube) && (
                <VideoLink
                  url={youtube}
                  chart={chart}
                  saved={details?.videoStart}
                  savedEnd={details?.videoEnd}
                  save={(points) => saveVideoPoints(versionId, points)}
                  isIconOnly
                />
              )}
              <StackItem size="fill">
                <TextInput
                  label={n("youtube")}
                  value={youtube}
                  onChange={setYoutube}
                  isOptional
                  {...fieldError("youtube_invalid")}
                />
              </StackItem>
            </HStack>
            {recordings.length > 0 && (
              // The band's audio plays here as on the version page, in the bar across the bottom,
              // and the preview follows it (T-2834); adding one stays in the version's "…" menu.
              <GridSpan columns="full">
                <BandAudio versionId={versionId} recordings={recordings} bands={[]} chart={chart} />
              </GridSpan>
            )}
            <GridSpan columns="full">
              <RadioList
                label={n("source")}
                value={sourceType}
                onChange={setSourceType}
                orientation={phone ? "vertical" : "horizontal"}
                isRequired
                {...fieldError("source_required")}
              >
                {SOURCE_TYPES.map((type) => (
                  <RadioListItem key={type} value={type} label={sources(type)} />
                ))}
              </RadioList>
            </GridSpan>
          </Grid>
        </VStack>
      }
      textLabel={t("textPanel")}
      text={
        <VStack gap={3}>
          {(state.status === "changed" || state.status === "error") && (
            <div role="alert">
              <Banner
                status="error"
                title={state.status === "changed" ? t("changed") : t("error")}
              />
            </div>
          )}
          <Text type="supporting">ChartDown {chart.version ?? SUPPORTED_VERSION}</Text>
          <ChartTextArea
            handle={lines}
            label={t("text")}
            value={text}
            onChange={setText}
            rows={18}
            isTall
            flags={[
              ...warnings.map((warning) => ({ line: warning.line, kind: "warning" as const })),
              ...(playingLine !== undefined
                ? [{ line: playingLine, kind: "playing" as const }]
                : []),
            ]}
            goToLabel={(line) => t("goToLine", { line })}
          />
          <Warnings warnings={warnings} onSelect={goTo} />
        </VStack>
      }
      previewLabel={t("preview")}
      preview={<ChartPreview chart={chart} />}
    />
  );
}

/** The parser's warnings, each with its line; choosing one moves the cursor there (R-03.1). */
export function Warnings({
  warnings,
  onSelect,
}: {
  warnings: Warning[];
  onSelect?: (line: number) => void;
}) {
  const t = useTranslations("editor");
  const w = useTranslations("warnings");
  const message = (warning: Warning) =>
    w.has(warning.code)
      ? w.rich(warning.code, {
          ...warning.values,
          code: (chunks) => <code>{chunks}</code>,
        })
      : warning.message;
  const summary = t("warnings", { count: warnings.length });
  return (
    <VStack gap={1}>
      <HStack gap={1} vAlign="center">
        <StatusDot variant={warnings.length === 0 ? "success" : "warning"} label={summary} />
        <Text type="supporting">{summary}</Text>
      </HStack>
      {warnings.length > 0 && (
        <List density="compact" header={<Text className="cd-visually-hidden">{summary}</Text>}>
          {warnings.map((warning, index) => (
            <Item
              key={index}
              as="li"
              onClick={() => onSelect?.(warning.line)}
              label={
                <Text>
                  <b>{t("line", { line: warning.line })}</b> {message(warning)}
                </Text>
              }
            />
          ))}
        </List>
      )}
    </VStack>
  );
}
