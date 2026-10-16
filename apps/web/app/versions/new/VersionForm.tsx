"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { parse, SUPPORTED_VERSION } from "chartdown";
import { useTranslations } from "next-intl";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SOURCE_TYPES, type VersionError } from "../../../lib/versions/validate";
import { ChartPreview } from "../../_components/ChartPreview";
import { Warnings } from "../[id]/edit/Editor";
import { createVersion, type VersionFormState } from "./actions";
import { CancelButton, WriteLayout } from "../../_components/WriteLayout";
import { bodyLine, splitTitle, withTitle } from "../../../lib/versions/title";
import { STARTER } from "../../../lib/versions/starter";
import type { ReviewItem } from "../../../lib/import/convert";
import { ImportReview } from "./import/ImportReview";
import { ChartTextArea, type ChartTextAreaHandle } from "../../_components/ChartTextArea";
import { reviewLines } from "../../../lib/import/review";

export interface VersionFormProps {
  /** The server's guess that the page opens on a phone (R-03.9). */
  phone: boolean;
  /** The existing song, or null for a new one. */
  song: { id: string; title: string; artists: string[] } | null;
  defaultTitle: string;
  defaultAuthor: string;
  /** The chart to start from, such as an imported sheet's draft (SPEC-10). */
  defaultContent?: string;
  /** Where Cancel goes: where the person came from (T-2404). */
  cancelHref?: string;
  /** What an import assumed, shown above the chart until the person publishes (R-10.8). */
  imported?: {
    review: ReviewItem[];
    key: string;
    /** A song already in the catalog with the same title (R-10.12). */
    existing: { id: string; title: string; artists: string[] } | null;
    onUseExisting: () => void;
    onStartOver: () => void;
  };
}

/** What is still missing before publishing, in the order the form asks for it. */
export function missing(fields: {
  title: string | null;
  author: string;
  content: string;
  source: string;
}): VersionError | null {
  if (fields.title !== null && !fields.title.trim()) return "title_required";
  if (!fields.author.trim()) return "author_required";
  if (!fields.content.trim()) return "chart_required";
  if (!fields.source) return "source_required";
  return null;
}

/**
 * The chart, its author and its source (R-02.1, R-02.2; T-2404): the same layout as the editor,
 * the song's details at the top and the chart's text beside its live preview. The title is
 * written once, in the details: a draft's `title:` line moves there, and publishing writes it
 * back into the chart. Always published as public (R-02.3). Publish waits for what is required
 * and says what is missing; Cancel goes back.
 */
export function VersionForm({
  song,
  defaultTitle,
  defaultAuthor,
  defaultContent,
  cancelHref = "/versions/new",
  imported,
  phone,
}: VersionFormProps) {
  const t = useTranslations("newVersion");
  const e = useTranslations("editor");
  const lines = useRef<ChartTextAreaHandle>(null);
  const c = useTranslations("catalog");
  const sources = useTranslations("version.source");
  const [state, action, pending] = useActionState<VersionFormState, FormData>(createVersion, {
    error: null,
    values: null,
  });
  const values = state.values;
  // A draft's title moves to the details; the import's lines follow the text without it.
  const [draft] = useState(() => splitTitle(values?.content ?? defaultContent ?? STARTER));
  const [title, setTitle] = useState(values?.title ?? (defaultTitle || draft.title || ""));
  const [artists, setArtists] = useState(values?.artists ?? "");
  const [author, setAuthor] = useState(values?.author ?? defaultAuthor);
  const [source, setSource] = useState<string>(values?.sourceType ?? "");
  const [album, setAlbum] = useState(values?.album ?? "");
  const [year, setYear] = useState(values?.year ?? "");
  const [youtube, setYoutube] = useState(values?.youtube ?? "");
  const [content, setContent] = useState(draft.body);
  const songTitle = song ? song.title : title.trim();
  const shown = useDeferredValue(content);
  const chart = useMemo(() => parse(withTitle(shown, songTitle)), [shown, songTitle]);
  const warnings = useMemo(() => parse(shown).warnings, [shown]);
  const review = useMemo(
    () =>
      imported?.review.map((item) => {
        if (item.line === undefined) return item;
        const line = bodyLine(item.line, draft.removed);
        if (line !== null) return { ...item, line };
        const rest = { ...item };
        delete rest.line;
        return rest;
      }) ?? [],
    [imported, draft],
  );
  const alertRef = useRef<HTMLDivElement>(null);
  const lacking = missing({ title: song ? null : title, author, content, source });
  const dirty = content !== draft.body || (!song && title !== (defaultTitle || draft.title || ""));
  const error = (code: VersionError) =>
    state.error === code
      ? { status: { type: "error" as const, message: t(`errors.${code}`) } }
      : {};

  // An error from the server moves focus to its message.
  useEffect(() => {
    if (state.error) alertRef.current?.focus();
  }, [state]);

  return (
    <form action={action} noValidate>
      {song && <input type="hidden" name="songId" value={song.id} />}
      <input
        type="hidden"
        name="content"
        value={content.trim() ? withTitle(content, songTitle) : ""}
      />
      <WriteLayout
        phone={phone}
        header={
          <LayoutHeader hasDivider>
            <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href="/catalog">{c("title")}</BreadcrumbItem>
                  <BreadcrumbItem>{t("title")}</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>{songTitle || t("title")}</Heading>
              </VStack>
              <HStack gap={2} vAlign="center">
                <CancelButton href={cancelHref} dirty={dirty} />
                <Button
                  type="submit"
                  variant="primary"
                  label={t("publish")}
                  isLoading={pending}
                  isDisabled={lacking !== null}
                  {...(lacking ? { tooltip: t(`errors.${lacking}`) } : {})}
                />
              </HStack>
            </HStack>
          </LayoutHeader>
        }
        detailsLabel={t("details")}
        details={
          <VStack gap={4}>
            {state.error && (
              <div role="alert" ref={alertRef} tabIndex={-1}>
                <Banner status="error" title={t(`errors.${state.error}`)} />
              </div>
            )}
            <Grid columns={{ minWidth: 220 }} gap={4} align="start">
              {song ? (
                <VStack gap={0.5}>
                  <Text type="supporting">{t("song")}</Text>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Text weight="semibold">
                      {song.title}
                      {song.artists.length > 0 && ` · ${song.artists.join(", ")}`}
                    </Text>
                    <Button
                      label={t("changeSong")}
                      variant="ghost"
                      size="sm"
                      href="/versions/new"
                    />
                  </HStack>
                </VStack>
              ) : (
                <>
                  <TextInput
                    label={t("songTitle")}
                    htmlName="title"
                    value={title}
                    onChange={setTitle}
                    isRequired
                    {...error("title_required")}
                  />
                  <TextInput
                    label={t("artists")}
                    htmlName="artists"
                    value={artists}
                    onChange={setArtists}
                    description={t("artistsHint")}
                  />
                </>
              )}
              <TextInput
                label={t("author")}
                htmlName="author"
                value={author}
                onChange={setAuthor}
                isRequired
                {...error("author_required")}
              />
              <TextInput
                label={t("album")}
                htmlName="album"
                value={album}
                onChange={setAlbum}
                isOptional
              />
              <TextInput
                label={t("year")}
                htmlName="year"
                value={year}
                onChange={setYear}
                isOptional
                {...error("year_invalid")}
              />
              <TextInput
                label={t("youtube")}
                htmlName="youtube"
                value={youtube}
                onChange={setYoutube}
                isOptional
                {...error("youtube_invalid")}
              />
              <GridSpan columns="full">
                <RadioList
                  label={t("source")}
                  description={t("sourceHint")}
                  htmlName="sourceType"
                  value={source}
                  onChange={setSource}
                  orientation={phone ? "vertical" : "horizontal"}
                  isRequired
                  {...error("source_required")}
                >
                  {SOURCE_TYPES.map((type) => (
                    <RadioListItem key={type} value={type} label={sources(type)} />
                  ))}
                </RadioList>
              </GridSpan>
            </Grid>
            <Banner status="info" title={t("cc0Title")} description={t("cc0")} />
          </VStack>
        }
        textLabel={t("chartTitle")}
        text={
          <VStack gap={3}>
            {imported && (
              <ImportReview
                onGoTo={(line) => lines.current?.goTo(line)}
                review={review}
                importedKey={imported.key}
                existing={imported.existing}
                onUseExisting={imported.onUseExisting}
                onStartOver={imported.onStartOver}
              />
            )}
            <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
              <Heading level={2}>{t("chartTitle")}</Heading>
              <Text type="supporting">ChartDown {chart.version ?? SUPPORTED_VERSION}</Text>
            </HStack>
            <ChartTextArea
              handle={lines}
              label={t("chart")}
              value={content}
              onChange={setContent}
              rows={16}
              isTall
              isRequired
              flags={[
                ...warnings.map((warning) => ({ line: warning.line, kind: "warning" as const })),
                ...(imported ? reviewLines(review) : []),
              ]}
              goToLabel={(line) => e("goToLine", { line })}
              {...(state.error === "chart_required"
                ? { status: { type: "error" as const, message: t("errors.chart_required") } }
                : {})}
            />
            <Warnings warnings={warnings} onSelect={(line) => lines.current?.goTo(line)} />
            {/* Letters work too (R-03.10): nobody has to know the Nashville numbers to start. */}
            <Text type="supporting">{t("lettersToo")}</Text>
            {!imported && content === STARTER && (
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="supporting">{t("starterHint")}</Text>
                <Button
                  size="sm"
                  variant="ghost"
                  label={t("import.open")}
                  href="/versions/new/import"
                />
              </HStack>
            )}
          </VStack>
        }
        previewLabel={t("preview")}
        preview={<ChartPreview chart={chart} />}
      />
    </form>
  );
}
