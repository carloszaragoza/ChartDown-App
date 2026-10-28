"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { SOURCE_TYPES, type VersionError } from "../../../lib/versions/validate";
import { createSong, type NewSongState } from "./actions";

const METERS = ["4/4", "3/4", "6/8", "12/8", "2/4", "2/2", "5/4", "7/8", "9/8"];
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"].flatMap((key) => [
  key,
  `${key}m`,
]);
const UNITS = [
  ["none", "none"],
  ["q", "q"],
  ["h", "h"],
  ["q.", "qDot"],
  ["e", "e"],
  ["h.", "hDot"],
  ["e.", "eDot"],
] as const;

/**
 * New song (R-13.2): one page with what a chart's first page says (title, artists, arranger, link
 * and source, as New version asks), then the music before the first bar: meter, tempo and what
 * it counts, key and feel, and the first section's name.
 */
export function NewSongForm({ defaultArranger }: { defaultArranger: string }) {
  const t = useTranslations("visual.newSong");
  const v = useTranslations("visual");
  const n = useTranslations("newVersion");
  const sources = useTranslations("version.source");
  const [state, action, pending] = useActionState<NewSongState, FormData>(createSong, {
    error: null,
    values: null,
  });
  const [title, setTitle] = useState(state.values?.title ?? "");
  const [artists, setArtists] = useState(state.values?.artists ?? "");
  const [author, setAuthor] = useState(state.values?.author ?? defaultArranger);
  const [youtube, setYoutube] = useState(state.values?.youtube ?? "");
  const [source, setSource] = useState(state.values?.sourceType ?? "");
  const [key, setKey] = useState("G");
  const [meter, setMeter] = useState("4/4");
  const [tempo, setTempo] = useState("72");
  const [unit, setUnit] = useState("none");
  const [feel, setFeel] = useState("");
  const [section, setSection] = useState(v("newSectionName"));
  const error = (code: VersionError) =>
    state.error === code
      ? { status: { type: "error" as const, message: n(`errors.${code}`) } }
      : {};

  return (
    <Layout
      height="auto"
      padding={8}
      contentWidth={760}
      header={
        <LayoutHeader>
          <VStack gap={1}>
            <Text type="supporting">{v("overline")}</Text>
            <Heading level={1}>{t("title")}</Heading>
            <Text color="secondary">{t("intro")}</Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <form action={action} noValidate>
            <input type="hidden" name="content" value="-" />
            <input type="hidden" name="album" value="" />
            <input type="hidden" name="year" value="" />
            <VStack gap={6}>
              {state.error && (
                <div role="alert">
                  <Banner status="error" title={n(`errors.${state.error}`)} />
                </div>
              )}
              <Card padding={6}>
                <Grid columns={{ minWidth: 260 }} gap={4} align="start">
                  <GridSpan columns="full">
                    <TextInput
                      label={t("songTitle")}
                      htmlName="title"
                      value={title}
                      onChange={setTitle}
                      size="lg"
                      isRequired
                      {...error("title_required")}
                    />
                  </GridSpan>
                  <TextInput
                    label={t("artists")}
                    description={t("artistsHint")}
                    htmlName="artists"
                    value={artists}
                    onChange={setArtists}
                    isOptional
                  />
                  <TextInput
                    label={t("arranger")}
                    htmlName="author"
                    value={author}
                    onChange={setAuthor}
                    isRequired
                    {...error("author_required")}
                  />
                  <GridSpan columns="full">
                    <TextInput
                      label={t("youtube")}
                      htmlName="youtube"
                      value={youtube}
                      onChange={setYoutube}
                      isOptional
                      {...error("youtube_invalid")}
                    />
                  </GridSpan>
                  <GridSpan columns="full">
                    <RadioList
                      label={t("source")}
                      htmlName="sourceType"
                      value={source}
                      onChange={setSource}
                      orientation="horizontal"
                      isRequired
                      {...error("source_required")}
                    >
                      {SOURCE_TYPES.map((type) => (
                        <RadioListItem key={type} value={type} label={sources(type)} />
                      ))}
                    </RadioList>
                  </GridSpan>
                </Grid>
              </Card>
              <Card padding={6}>
                <VStack gap={4}>
                  <Heading level={2}>{t("music")}</Heading>
                  <Grid columns={{ minWidth: 180 }} gap={4} align="start">
                    <Selector
                      label={t("meter")}
                      options={METERS}
                      value={meter}
                      onChange={setMeter}
                      htmlName="meter"
                    />
                    <TextInput
                      label={t("tempo")}
                      htmlName="tempo"
                      value={tempo}
                      onChange={(value) => setTempo(value.replace(/[^\d.]/g, ""))}
                    />
                    <Selector
                      label={t("unit")}
                      options={UNITS.map(([value, name]) => ({ value, label: v(`unit.${name}`) }))}
                      value={unit}
                      onChange={setUnit}
                      htmlName="unit"
                    />
                    <Selector
                      label={t("key")}
                      options={KEYS}
                      value={key}
                      onChange={setKey}
                      htmlName="key"
                    />
                    <TextInput
                      label={t("feel")}
                      htmlName="feel"
                      value={feel}
                      onChange={setFeel}
                      isOptional
                    />
                    <TextInput
                      label={t("firstSection")}
                      htmlName="section"
                      value={section}
                      onChange={setSection}
                    />
                  </Grid>
                </VStack>
              </Card>
              <HStack gap={2} hAlign="end">
                <Button label={v("cancel")} variant="ghost" href="/" />
                <Button type="submit" label={t("start")} variant="primary" isLoading={pending} />
              </HStack>
            </VStack>
          </form>
        </LayoutContent>
      }
    />
  );
}
