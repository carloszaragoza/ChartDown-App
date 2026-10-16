"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { groupReview, importAssumptions, type ReviewItem } from "../../../../lib/import/review";

/**
 * What the import assumed, above the draft (R-10.8): the key it read or guessed, the rows whose
 * bars it proposed, and anything it could not map. Nothing is saved until the person publishes.
 */
export function ImportReview({
  review,
  importedKey,
  existing,
  onUseExisting,
  onStartOver,
  onGoTo,
}: {
  review: ReviewItem[];
  importedKey: string;
  existing: { id: string; title: string } | null;
  onUseExisting: () => void;
  onStartOver: () => void;
  /** Selects a line of the chart. */
  onGoTo: (line: number) => void;
}) {
  const t = useTranslations("newVersion.import.review");
  const guessed = review.some((item) => item.kind === "key-guessed");
  const groups = groupReview(importAssumptions(review)).filter(
    (group) => group.kind !== "key-guessed",
  );
  return (
    <section aria-labelledby="import-review">
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Heading level={2} id="import-review">
            {t("title")}
          </Heading>
          <Button variant="ghost" size="sm" label={t("startOver")} onClick={onStartOver} />
        </HStack>
        <Text color="secondary">{t("notSaved")}</Text>
        {existing && (
          <Banner
            status="info"
            title={t("existing", { title: existing.title })}
            description={t("existingHint")}
            endContent={
              <HStack gap={2} wrap="wrap">
                <Button size="sm" label={t("useExisting")} onClick={onUseExisting} />
                <Button
                  size="sm"
                  variant="ghost"
                  label={t("openExisting")}
                  href={`/songs/${existing.id}`}
                />
              </HStack>
            }
          />
        )}
        <Banner
          status={guessed ? "warning" : "info"}
          title={
            guessed ? t("keyGuessed", { key: importedKey }) : t("keyRead", { key: importedKey })
          }
        />
        {groups.map((group) => (
          <VStack key={group.kind} gap={2}>
            <Banner
              status="warning"
              title={t(`kinds.${group.kind}`, { count: Math.max(group.lines.length, 1) })}
              {...(group.lines.length === 0 && group.details.length > 0
                ? { description: group.details.join(" · ") }
                : {})}
            />
            {group.lines.length > 0 && (
              <HStack gap={1} wrap="wrap" role="group" aria-label={t("linesLabel")}>
                {group.lines.map((line, index) => (
                  <Button
                    key={`${line}-${index}`}
                    size="sm"
                    variant="ghost"
                    label={t("goTo", { line })}
                    onClick={() => onGoTo(line)}
                  >
                    {String(line)}
                  </Button>
                ))}
              </HStack>
            )}
          </VStack>
        ))}
        {groups.length === 0 && <Banner status="success" title={t("nothing")} />}
      </VStack>
    </section>
  );
}
