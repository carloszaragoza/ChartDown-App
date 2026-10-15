"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { parse, SUPPORTED_VERSION } from "chartdown";
import { useTranslations } from "next-intl";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SOURCE_TYPES, type VersionError } from "../../../lib/versions/validate";
import { ChartPreview } from "../../_components/ChartPreview";
import { Warnings } from "../[id]/edit/Editor";
import { createVersion, type VersionFormState } from "./actions";
import { PageLayout } from "../../_components/PageLayout";
import type { ReviewItem } from "../../../lib/import/convert";
import { ImportReview } from "./import/ImportReview";

// A place to start: two sections the person replaces with their own chart.
const STARTER = "## Verse\n1 | 4 | 6m | 5\n\n## Chorus\n4 | 1 | 5 | 1\n";

export interface VersionFormProps {
  /** The server's guess that the page opens on a phone (R-03.9). */
  phone: boolean;
  /** The existing song, or null for a new one. */
  song: { id: string; title: string; artists: string[] } | null;
  defaultTitle: string;
  defaultAuthor: string;
  /** The chart to start from, such as an imported sheet's draft (SPEC-10). */
  defaultContent?: string;
  /** What an import assumed, shown above the chart until the person publishes (R-10.8). */
  imported?: { review: ReviewItem[]; key: string; onStartOver: () => void };
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
 * The chart, its author and its source (R-02.1, R-02.2; Design Handoff 2.0 screen 05): the song's
 * details in a panel, the chart with a live preview beside them. Always published as public
 * (R-02.3). Publish waits for what is required and says what is missing.
 */
export function VersionForm({
  song,
  defaultTitle,
  defaultAuthor,
  defaultContent,
  imported,
  phone,
}: VersionFormProps) {
  const t = useTranslations("newVersion");
  const c = useTranslations("catalog");
  const sources = useTranslations("version.source");
  const [state, action, pending] = useActionState<VersionFormState, FormData>(createVersion, {
    error: null,
    values: null,
  });
  const values = state.values;
  const [title, setTitle] = useState(values?.title ?? defaultTitle);
  const [artists, setArtists] = useState(values?.artists ?? "");
  const [author, setAuthor] = useState(values?.author ?? defaultAuthor);
  const [source, setSource] = useState<string>(values?.sourceType ?? "");
  const [album, setAlbum] = useState(values?.album ?? "");
  const [year, setYear] = useState(values?.year ?? "");
  const [youtube, setYoutube] = useState(values?.youtube ?? "");
  const [content, setContent] = useState(values?.content ?? defaultContent ?? STARTER);
  const shown = useDeferredValue(content);
  const chart = useMemo(() => parse(shown), [shown]);
  const alertRef = useRef<HTMLDivElement>(null);
  const lacking = missing({ title: song ? null : title, author, content, source });
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
      <PageLayout
        phone={phone}
        height="auto"
        // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
        padding={8}
        header={
          <LayoutHeader hasDivider>
            <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href="/catalog">{c("title")}</BreadcrumbItem>
                  <BreadcrumbItem>{t("title")}</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>{(song ? song.title : title.trim()) || t("title")}</Heading>
              </VStack>
              <HStack gap={2} vAlign="center">
                <Button label={t("changeSong")} variant="ghost" href="/versions/new" />
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
        panel={{
          side: "start",
          width: 400,
          label: t("details"),
          firstOnPhone: true,
          children: (
            <>
              <VStack gap={5}>
                {state.error && (
                  <div role="alert" ref={alertRef} tabIndex={-1}>
                    <Banner status="error" title={t(`errors.${state.error}`)} />
                  </div>
                )}
                <FormLayout>
                  {song ? (
                    <VStack gap={0.5}>
                      <Text type="supporting">{t("song")}</Text>
                      <Text weight="semibold">
                        {song.title}
                        {song.artists.length > 0 && ` · ${song.artists.join(", ")}`}
                      </Text>
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
                  <RadioList
                    label={t("source")}
                    description={t("sourceHint")}
                    htmlName="sourceType"
                    value={source}
                    onChange={setSource}
                    isRequired
                    {...error("source_required")}
                  >
                    {SOURCE_TYPES.map((type) => (
                      <RadioListItem key={type} value={type} label={sources(type)} />
                    ))}
                  </RadioList>
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
                </FormLayout>
                <Banner status="info" title={t("cc0Title")} description={t("cc0")} />
              </VStack>
            </>
          ),
        }}
        contentProps={{ padding: 8 }}
        content={
          <>
            <VStack gap={6}>
              {imported && (
                <ImportReview
                  review={imported.review}
                  importedKey={imported.key}
                  onStartOver={imported.onStartOver}
                />
              )}
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                  <Heading level={2}>{t("chartTitle")}</Heading>
                  <Text type="supporting">ChartDown {chart.version ?? SUPPORTED_VERSION}</Text>
                </HStack>
                <TextArea
                  label={t("chart")}
                  isLabelHidden
                  htmlName="content"
                  value={content}
                  onChange={setContent}
                  rows={10}
                  hasSpellCheck={false}
                  isRequired
                  {...error("chart_required")}
                />
                <Warnings warnings={chart.warnings} />
              </VStack>
              <section aria-label={t("preview")}>
                <ChartPreview chart={chart} />
              </section>
            </VStack>
          </>
        }
      />
    </form>
  );
}
