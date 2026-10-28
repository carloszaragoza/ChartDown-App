"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MAX_IMPORT_BYTES, readImport, type ImportResult } from "../../../../lib/visual/import";
import type { VisualChart } from "../../../../lib/visual/model";

/**
 * Import a chart written in ChartDown (R-13.17): a file of any plain-text kind or pasted text,
 * read here in the browser. A ChartDown text replaces the chart, which Undo takes back; one with
 * warnings lists them; anything else points to the chord sheet importer (SPEC-10).
 */
export function ImportDialog({
  isOpen,
  onOpenChange,
  onImport,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (chart: VisualChart) => void;
}) {
  const t = useTranslations("visual.import");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const close = () => {
    setFile(null);
    setText("");
    setResult(null);
    onOpenChange(false);
  };
  const pick = async (picked: File | File[] | null) => {
    const one = Array.isArray(picked) ? (picked[0] ?? null) : picked;
    setFile(one);
    setResult(null);
    if (one) setText(await one.text());
  };
  const run = () => {
    const read = readImport(text);
    if (read.kind === "chart") {
      onImport(read.chart);
      close();
    } else setResult(read);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => (open ? onOpenChange(true) : close())}
      padding={4}
      width={640}
      purpose="form"
    >
      <VStack gap={4}>
        <Heading level={2}>{t("title")}</Heading>
        <Text color="secondary">{t("intro")}</Text>
        <FileInput
          label={t("file")}
          description={t("fileHint")}
          maxSize={MAX_IMPORT_BYTES}
          value={file}
          onChange={(picked) => void pick(picked)}
          isOptional
        />
        <TextArea
          label={t("paste")}
          value={text}
          onChange={(value) => {
            setText(value);
            setResult(null);
          }}
          rows={10}
          hasSpellCheck={false}
          placeholder={"## Verse 1\n1 | 4 | 6m | 5"}
        />
        {result?.kind === "empty" && <Banner status="error" title={t("empty")} />}
        {result?.kind === "notChartDown" && (
          <Banner status="warning" title={t("notChartDown")} description={t("notChartDownHint")} />
        )}
        {result?.kind === "warnings" && (
          <VStack gap={2}>
            <Banner status="warning" title={t("warnings")} description={t("warningsHint")} />
            {result.warnings.slice(0, 6).map((warning, index) => (
              <Text key={index}>
                <b>{t("line", { line: warning.line })}</b> {warning.message}
              </Text>
            ))}
          </VStack>
        )}
        <Text type="supporting">{t("replaces")}</Text>
        <HStack gap={2} hAlign="end" wrap="wrap">
          {result?.kind === "notChartDown" && (
            <Button label={t("sheetImporter")} variant="ghost" href="/versions/new/import" />
          )}
          <Button label={t("cancel")} variant="ghost" onClick={close} />
          <Button
            label={t("import")}
            variant="primary"
            isDisabled={text.trim() === ""}
            onClick={run}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
