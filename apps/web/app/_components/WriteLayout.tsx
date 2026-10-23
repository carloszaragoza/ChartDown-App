"use client";

import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { percent, pixel } from "@astryxdesign/core/Resizable/utils";
import { StackItem } from "@astryxdesign/core/Stack";
import { VStack } from "@astryxdesign/core/VStack";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePhone } from "../../lib/shell/phone";
import { useDockRoomSize } from "./DockRoom";
import { PageLayout } from "./PageLayout";

/**
 * One layout to write a version, for Edit and New version (R-02.1, R-03.1; owner's review,
 * October 16, 2026): the song's details in a panel at the top, then the chart's text on the left,
 * as tall as the screen, and the drawn chart on the right, with a separator between them that the
 * person drags to give either more width, remembered on the device (T-2409); one column on a
 * phone.
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
      // The app's own area scrolls the page, so the text can stay pinned in it (T-2837).
      contentProps={{ isScrollable: false }}
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={header}
      content={
        <VStack gap={6}>
          <Card>
            <section aria-label={detailsLabel}>{details}</section>
          </Card>
          <Split
            phone={phone}
            text={<section aria-label={textLabel}>{text}</section>}
            preview={
              <section aria-label={previewLabel} className="cd-chart-compact">
                {preview}
              </section>
            }
          />
        </VStack>
      }
    />
  );
}

const SPLIT_KEY = "chartdown:write-split";

/**
 * The chart's text and the drawn chart side by side, with a separator to drag; each keeps at
 * least a quarter of the row. The text stays in view, as tall as the screen above an open player,
 * while the page follows the chart as it plays (owner's request, October 23, 2026, T-2837); its
 * own scroll never moves the chart. On a phone, one above the other.
 */
function Split({ phone, text, preview }: { phone: boolean; text: ReactNode; preview: ReactNode }) {
  const t = useTranslations("editor");
  const isPhone = usePhone(phone);
  const room = useDockRoomSize();
  const row = useRef<HTMLDivElement>(null);
  const textWidth = useResizable({
    containerRef: row,
    defaultSize: pixel(520),
    minSize: percent(25, { min: pixel(240) }),
    maxSize: "75%",
  });
  // The width is kept on this device: saved when the person lets go of the separator, and read
  // once the page is in the browser (the server has none).
  const { resize } = textWidth;
  const width = useRef(textWidth.size);
  useEffect(() => {
    width.current = textWidth.size;
  });
  const keep = () => {
    try {
      localStorage.setItem(SPLIT_KEY, String(Math.round(width.current)));
    } catch {
      // Not kept: the default width next time.
    }
  };
  useEffect(() => {
    try {
      const kept = Number(localStorage.getItem(SPLIT_KEY));
      if (kept > 0) resize(kept);
    } catch {
      // No storage, as in a private window: the default width.
    }
  }, [resize]);
  if (isPhone)
    return (
      <VStack gap={6}>
        {text}
        {preview}
      </VStack>
    );
  return (
    <HStack ref={row} gap={2} vAlign="stretch">
      <div
        className="cd-write-text"
        style={
          {
            inlineSize: textWidth.size,
            "--cd-dock-room": `${room}px`,
          } as CSSProperties
        }
      >
        {text}
      </div>
      {/* Stretched to the row's height, so the handle can be grabbed all along it. */}
      <div
        style={{ display: "flex", flex: "none" }}
        // A moment later, so the width is the one the separator ended on.
        onPointerUp={() => window.setTimeout(keep)}
        onKeyUp={() => window.setTimeout(keep)}
      >
        <ResizeHandle direction="horizontal" resizable={textWidth.props} label={t("resize")} />
      </div>
      <StackItem size="fill">{preview}</StackItem>
    </HStack>
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
