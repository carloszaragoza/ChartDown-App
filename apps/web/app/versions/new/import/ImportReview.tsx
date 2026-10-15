"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { groupReview, type ReviewItem } from "../../../../lib/import/review";

/**
 * What the import assumed, above the draft (R-10.8): the key it read or guessed, the rows whose
 * bars it proposed, and anything it could not map. Nothing is saved until the person publishes.
 */
export function ImportReview({
  review,
  importedKey,
  onStartOver,
}: {
  review: ReviewItem[];
  importedKey: string;
  onStartOver: () => void;
}) {
  const t = useTranslations("newVersion.import.review");
  const guessed = review.some((item) => item.kind === "key-guessed");
  const groups = groupReview(review).filter((group) => group.kind !== "key-guessed");
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
        <Banner
          status={guessed ? "warning" : "info"}
          title={
            guessed ? t("keyGuessed", { key: importedKey }) : t("keyRead", { key: importedKey })
          }
        />
        {groups.map((group) => (
          <Banner
            key={group.kind}
            status="warning"
            title={t(`kinds.${group.kind}`, { count: Math.max(group.lines.length, 1) })}
            {...(group.lines.length > 0
              ? { description: t("lines", { lines: group.lines.join(", ") }) }
              : group.details.length > 0
                ? { description: group.details.join(" · ") }
                : {})}
          />
        ))}
        {groups.length === 0 && <Banner status="success" title={t("nothing")} />}
      </VStack>
    </section>
  );
}
