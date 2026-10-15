"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DEFAULT_LANDMARK_WORDS,
  importSheet,
  type ImportResult,
  type ImportStyle,
} from "../../../../lib/import/convert";
import { readPaste } from "../../../../lib/import/paste";
import { usePhone } from "../../../../lib/shell/phone";
import { VersionForm } from "../VersionForm";

/**
 * Importing a chord sheet by pasting it (SPEC-10, R-10.13, T-1409): the person pastes the sheet,
 * chooses numbers or letters and whether to keep a landmark per section, confirms the sheet is
 * theirs to use, and gets the draft in New version with a list of what to review. The text is
 * converted in the browser and never sent anywhere; nothing is saved until they publish.
 */
export function ImportFlow({ author, phone }: { author: string; phone: boolean }) {
  const t = useTranslations("newVersion.import");
  const n = useTranslations("newVersion");
  const c = useTranslations("catalog");
  const isPhone = usePhone(phone);
  const [text, setText] = useState("");
  const [style, setStyle] = useState<ImportStyle>("numbers");
  const [landmarks, setLandmarks] = useState(true);
  const [rights, setRights] = useState(false);
  const [problem, setProblem] = useState<"empty" | "too_long" | "no_chords" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (result)
    return (
      <VersionForm
        phone={phone}
        song={null}
        defaultTitle={result.title ?? ""}
        defaultAuthor={author}
        defaultContent={result.source}
        imported={{ review: result.review, key: result.key, onStartOver: () => setResult(null) }}
      />
    );

  const convert = () => {
    const read = readPaste(text);
    if (read !== "ok") return setProblem(read);
    const draft = importSheet(text, {
      style,
      landmarkWords: landmarks ? DEFAULT_LANDMARK_WORDS : 0,
    });
    if (draft.sections === 0) return setProblem("no_chords");
    setProblem(null);
    setResult(draft);
  };

  return (
    <Layout
      height="auto"
      padding={isPhone ? 4 : 8}
      contentWidth={760}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href="/catalog">{c("title")}</BreadcrumbItem>
              <BreadcrumbItem href="/versions/new">{n("title")}</BreadcrumbItem>
              <BreadcrumbItem>{t("title")}</BreadcrumbItem>
            </Breadcrumbs>
            <Heading level={1}>{t("title")}</Heading>
            <Text color="secondary">{t("intro")}</Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={5}>
            {problem && (
              <div role="alert">
                <Banner status="error" title={t(`problems.${problem}`)} />
              </div>
            )}
            <TextArea
              label={t("sheet")}
              description={t("sheetHint")}
              value={text}
              onChange={setText}
              rows={isPhone ? 12 : 18}
              hasSpellCheck={false}
              placeholder={t("placeholder")}
            />
            <VStack gap={3}>
              <SegmentedControl
                label={t("style")}
                value={style}
                onChange={(value) => setStyle(value === "letters" ? "letters" : "numbers")}
              >
                <SegmentedControlItem value="numbers" label={t("numbers")} />
                <SegmentedControlItem value="letters" label={t("letters")} />
              </SegmentedControl>
              <Switch
                label={t("landmarks")}
                description={t("landmarksHint", { words: DEFAULT_LANDMARK_WORDS })}
                value={landmarks}
                onChange={setLandmarks}
              />
              <CheckboxInput label={t("rights")} value={rights} onChange={setRights} />
            </VStack>
            <Text type="supporting">{t("privacy")}</Text>
            <HStack gap={2}>
              <Button
                variant="primary"
                label={t("convert")}
                isDisabled={!rights || text.trim() === ""}
                {...(!rights ? { tooltip: t("rightsFirst") } : {})}
                onClick={convert}
              />
              <Button variant="ghost" label={t("cancel")} href="/versions/new" />
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
