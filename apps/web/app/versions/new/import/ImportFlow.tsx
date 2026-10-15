"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { FileInput } from "@astryxdesign/core/FileInput";
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
import { MAX_BYTES } from "../../../../lib/import/pdfLines";
import { readPdf, type PdfProblem } from "../../../../lib/import/readPdf";
import { usePhone } from "../../../../lib/shell/phone";
import { VersionForm } from "../VersionForm";
import { findSong, type ExistingSong } from "./actions";

/**
 * Importing a chord sheet by pasting it or from a PDF (SPEC-10, R-10.13, T-1409, T-1408): the
 * person pastes the sheet, or picks a PDF whose text fills the same box for them to check,
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
  const [problem, setProblem] = useState<"empty" | "too_long" | "no_chords" | PdfProblem | null>(
    null,
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fromPdf, setFromPdf] = useState<string | null>(null);
  const [existing, setExisting] = useState<ExistingSong | null>(null);
  const [toExisting, setToExisting] = useState(false);

  // A PDF is read in the browser and its text fills the box, to check before converting.
  const choosePdf = async (picked: File | File[] | null) => {
    const one = Array.isArray(picked) ? (picked[0] ?? null) : picked;
    setFile(one);
    setFromPdf(null);
    if (!one) return;
    const read = await readPdf(one);
    if ("problem" in read) return setProblem(read.problem);
    setProblem(null);
    setText(read.text);
    setFromPdf(one.name);
  };

  if (result)
    return (
      <VersionForm
        phone={phone}
        song={toExisting ? existing : null}
        defaultTitle={result.title ?? ""}
        defaultAuthor={author}
        defaultContent={result.source}
        imported={{
          review: result.review,
          key: result.key,
          existing: toExisting ? null : existing,
          onUseExisting: () => setToExisting(true),
          onStartOver: () => {
            setResult(null);
            setExisting(null);
            setToExisting(false);
          },
        }}
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
    // A song already in the catalog with this title is offered instead of a duplicate (R-10.12).
    if (draft.title) void findSong(draft.title).then(setExisting);
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
            {problem && <Banner status="error" title={t(`problems.${problem}`)} />}
            <FileInput
              label={t("pdf")}
              description={t("pdfHint")}
              accept=".pdf,application/pdf"
              maxSize={MAX_BYTES}
              value={file}
              onChange={(picked) => void choosePdf(picked)}
              isOptional
            />
            {fromPdf && (
              <div role="status">
                <Banner status="success" title={t("pdfRead", { name: fromPdf })} />
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
