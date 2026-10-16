"use client";

import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/VStack";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { PageLayout } from "./PageLayout";

/**
 * One layout to write a version, for Edit and New version (R-02.1, R-03.1; owner's review,
 * October 16, 2026): the song's details in a panel at the top, then the chart's text on the left,
 * as tall as the screen, and the drawn chart on the right; one column on a narrow screen.
 */
export function WriteLayout({
  phone,
  header,
  details,
  detailsLabel,
  text,
  textLabel,
  preview,
  previewLabel,
}: {
  /** The server's guess that the page opens on a phone (R-03.9). */
  phone: boolean;
  header: ReactNode;
  details: ReactNode;
  detailsLabel: string;
  text: ReactNode;
  textLabel: string;
  preview: ReactNode;
  previewLabel: string;
}) {
  return (
    <PageLayout
      phone={phone}
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={header}
      content={
        <VStack gap={6}>
          <Card>
            <section aria-label={detailsLabel}>{details}</section>
          </Card>
          <Grid columns={{ minWidth: 360, max: 2 }} gap={6} align="start">
            <section aria-label={textLabel}>{text}</section>
            <section aria-label={previewLabel} className="cd-chart-compact">
              {preview}
            </section>
          </Grid>
        </VStack>
      }
    />
  );
}

/**
 * Cancel: back to where the person came from, an installed app having no browser back button.
 * With changes it asks first.
 */
export function CancelButton({ href, dirty }: { href: string; dirty: boolean }) {
  const t = useTranslations("editor");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  if (!dirty) return <Button label={t("cancel")} variant="ghost" href={href} />;
  return (
    <>
      <Button label={t("cancel")} variant="ghost" onClick={() => setAsking(true)} />
      <AlertDialog
        isOpen={asking}
        onOpenChange={setAsking}
        title={t("leaveTitle")}
        description={t("leaveDescription")}
        actionLabel={t("leave")}
        cancelLabel={t("keepWriting")}
        onAction={() => router.push(href)}
      />
    </>
  );
}
