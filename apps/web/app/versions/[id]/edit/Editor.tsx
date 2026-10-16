"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Item } from "@astryxdesign/core/Item";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { parse, SUPPORTED_VERSION, type Warning } from "chartdown";
import { ClockIcon, GlobeAltIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChartTextArea, type ChartTextAreaHandle } from "../../../_components/ChartTextArea";
import { ChartPreview } from "../../../_components/ChartPreview";
import { saveChart, type SaveState } from "./actions";
import { PageLayout } from "../../../_components/PageLayout";

export interface EditorProps {
  /** The server's guess that the page opens on a phone (R-03.9). */
  phone: boolean;
  versionId: string;
  title: string;
  visibility: "public" | "private";
  revisionId: string;
  content: string;
  /** The version's source, as the header shows it ("Own arrangement", "Live 2025"). */
  source: string;
  revisionNumber: number;
  /** When the current revision was saved (ISO). */
  savedAt: string;
}

/**
 * The chart editor (R-03.1; Design Handoff 2.0 screen 06): the text in a panel on the left, a
 * live preview beside it that follows the typing without reloading, and the parser's warnings
 * with their lines. Warnings never block a save.
 */
export function Editor({
  phone,
  versionId,
  title,
  visibility,
  revisionId,
  content,
  source,
  revisionNumber,
  savedAt,
}: EditorProps) {
  const t = useTranslations("editor");
  const v = useTranslations("version");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const router = useRouter();
  const [text, setText] = useState(content);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveChart, {
    status: "idle",
    baseRevisionId: revisionId,
    savedContent: content,
  });
  const dirty = text !== state.savedContent;
  // The preview may lag a keystroke behind so typing never waits for it.
  const shown = useDeferredValue(text);
  const chart = useMemo(() => parse(shown), [shown]);
  const lines = useRef<ChartTextAreaHandle>(null);
  // After a save, the header follows the new revision.
  const saved =
    state.number && state.savedAt
      ? { number: state.number, at: state.savedAt }
      : { number: revisionNumber, at: savedAt };

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const goTo = (line: number) => lines.current?.goTo(line);

  return (
    <PageLayout
      phone={phone}
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">
                {t("savedLine", {
                  source,
                  number: saved.number,
                  when: format.relativeTime(new Date(saved.at), now),
                })}{" "}
                · <Link href={`/versions/${versionId}`}>{t("view")}</Link>
              </Text>
              <Heading level={1}>{title}</Heading>
            </VStack>
            <form action={action}>
              <input type="hidden" name="versionId" value={versionId} />
              <input type="hidden" name="content" value={text} />
              <HStack gap={2} vAlign="center" wrap="wrap">
                {/* Going private is its own flow (R-02.4), with no way back. */}
                <SegmentedControl
                  label={t("visibility")}
                  value={visibility}
                  isDisabled={visibility === "private"}
                  disabledMessage={t("privateForGood")}
                  onChange={(value) => {
                    if (value === "private") router.push(`/versions/${versionId}/make-private`);
                  }}
                >
                  <SegmentedControlItem
                    value="public"
                    label={t("public")}
                    icon={<Icon icon={GlobeAltIcon} />}
                  />
                  <SegmentedControlItem
                    value="private"
                    label={v("private")}
                    icon={<Icon icon={LockClosedIcon} />}
                  />
                </SegmentedControl>
                <Button
                  label={v("history")}
                  href={`/versions/${versionId}/history`}
                  icon={<Icon icon={ClockIcon} />}
                />
                <Button
                  type="submit"
                  variant="primary"
                  label={t("save")}
                  isLoading={pending}
                  isDisabled={!dirty}
                  {...(!dirty ? { tooltip: t("noChanges") } : {})}
                />
              </HStack>
            </form>
          </HStack>
        </LayoutHeader>
      }
      panel={{
        side: "start",
        width: 460,
        label: t("textPanel"),
        firstOnPhone: true,
        children: (
          <>
            <VStack gap={3}>
              <div role="status">
                {state.status === "saved" && !dirty && (
                  <Banner status="success" title={t("saved", { number: state.number ?? "" })} />
                )}
              </div>
              {(state.status === "changed" || state.status === "error") && (
                <div role="alert">
                  <Banner
                    status="error"
                    title={state.status === "changed" ? t("changed") : t("error")}
                  />
                </div>
              )}
              <Text type="supporting">ChartDown {chart.version ?? SUPPORTED_VERSION}</Text>
              <ChartTextArea
                handle={lines}
                label={t("text")}
                value={text}
                onChange={setText}
                rows={18}
                flags={chart.warnings.map((warning) => ({
                  line: warning.line,
                  kind: "warning" as const,
                }))}
                goToLabel={(line) => t("goToLine", { line })}
              />
              <Warnings warnings={chart.warnings} onSelect={goTo} />
            </VStack>
          </>
        ),
      }}
      contentProps={{ padding: 8, role: "region", label: t("preview") }}
      content={
        <>
          <ChartPreview chart={chart} />
        </>
      }
    />
  );
}

/** The parser's warnings, each with its line; choosing one moves the cursor there (R-03.1). */
export function Warnings({
  warnings,
  onSelect,
}: {
  warnings: Warning[];
  onSelect?: (line: number) => void;
}) {
  const t = useTranslations("editor");
  const w = useTranslations("warnings");
  const message = (warning: Warning) =>
    w.has(warning.code)
      ? w.rich(warning.code, {
          ...warning.values,
          code: (chunks) => <code>{chunks}</code>,
        })
      : warning.message;
  const summary = t("warnings", { count: warnings.length });
  return (
    <VStack gap={1}>
      <HStack gap={1} vAlign="center">
        <StatusDot variant={warnings.length === 0 ? "success" : "warning"} label={summary} />
        <Text type="supporting">{summary}</Text>
      </HStack>
      {warnings.length > 0 && (
        <List density="compact" header={<Text className="cd-visually-hidden">{summary}</Text>}>
          {warnings.map((warning, index) => (
            <Item
              key={index}
              as="li"
              onClick={() => onSelect?.(warning.line)}
              label={
                <Text>
                  <b>{t("line", { line: warning.line })}</b> {message(warning)}
                </Text>
              }
            />
          ))}
        </List>
      )}
    </VStack>
  );
}
