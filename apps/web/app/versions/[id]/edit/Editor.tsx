"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Grid } from "@astryxdesign/core/Grid";
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
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChartTextArea, type ChartTextAreaHandle } from "../../../_components/ChartTextArea";
import { ChartPreview } from "../../../_components/ChartPreview";
import { saveChart, type SaveState } from "./actions";
import { saveVideoStart } from "../actions";
import { CancelButton, WriteLayout } from "../../../_components/WriteLayout";
import { VideoLink } from "../../../_components/VideoDock";
import { splitTitle, withTitle } from "../../../../lib/versions/title";

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
  /** The song's details, shown at the top (T-2404). */
  details?: {
    artists: string[];
    author: string;
    album: string | null;
    year: number | null;
    youtube: string | null;
    /** Where the music starts in the video, in seconds, as saved (R-03.11). */
    videoStart?: number | null;
  };
}

/**
 * The chart editor (R-03.1; T-2404): the song's details at the top, the text on the left as tall
 * as the screen and a live preview beside it that follows the typing without reloading, with the
 * parser's warnings and their lines. The title is written once, in the details: the text leaves
 * out its `title:` line and saving puts it back. Warnings never block a save; a save returns to
 * the version, and Cancel goes back to it.
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
  details,
}: EditorProps) {
  const t = useTranslations("editor");
  const v = useTranslations("version");
  const n = useTranslations("newVersion");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const router = useRouter();
  const [text, setText] = useState(() => splitTitle(content).body);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveChart, {
    status: "idle",
    baseRevisionId: revisionId,
    savedContent: content,
  });
  const dirty = text !== splitTitle(state.savedContent).body;
  // The preview may lag a keystroke behind so typing never waits for it.
  const shown = useDeferredValue(text);
  const chart = useMemo(() => parse(withTitle(shown, title)), [shown, title]);
  // The warnings name the lines of the text on screen, which has no title line.
  const warnings = useMemo(() => parse(shown).warnings, [shown]);
  const lines = useRef<ChartTextAreaHandle>(null);
  const page = `/versions/${versionId}`;

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // A save returns to the version, with its new revision.
  useEffect(() => {
    if (state.status === "saved") router.push(`${page}?saved=${state.number ?? ""}`);
  }, [state, router, page]);

  const goTo = (line: number) => lines.current?.goTo(line);
  const facts = details
    ? [
        { label: n("author"), value: details.author },
        { label: n("source"), value: source },
        details.album ? { label: n("album"), value: details.album } : null,
        details.youtube
          ? {
              label: n("youtube"),
              value: (
                <VideoLink
                  url={details.youtube}
                  chart={chart}
                  saved={details.videoStart}
                  save={(milliseconds) => saveVideoStart(versionId, milliseconds)}
                />
              ),
            }
          : null,
      ].filter((fact) => fact !== null)
    : [];

  return (
    <WriteLayout
      phone={phone}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={1}>
              <Text type="supporting">
                {t("savedLine", {
                  source,
                  number: state.number ?? revisionNumber,
                  when: format.relativeTime(new Date(state.savedAt ?? savedAt), now),
                })}
              </Text>
              <Heading level={1}>{title}</Heading>
              {details && details.artists.length > 0 && (
                <Text color="secondary">{details.artists.join(", ")}</Text>
              )}
            </VStack>
            <form action={action}>
              <input type="hidden" name="versionId" value={versionId} />
              <input type="hidden" name="content" value={withTitle(text, title)} />
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
                <CancelButton href={page} dirty={dirty} />
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
      detailsLabel={n("details")}
      details={
        <Grid columns={{ minWidth: 180 }} gap={4}>
          {facts.map((fact) => (
            <VStack key={fact.label} gap={0.5}>
              <Text type="supporting">{fact.label}</Text>
              {typeof fact.value === "string" ? (
                <Text weight="semibold">{fact.value}</Text>
              ) : (
                <HStack>{fact.value}</HStack>
              )}
            </VStack>
          ))}
        </Grid>
      }
      textLabel={t("textPanel")}
      text={
        <VStack gap={3}>
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
            isTall
            flags={warnings.map((warning) => ({ line: warning.line, kind: "warning" as const }))}
            goToLabel={(line) => t("goToLine", { line })}
          />
          <Warnings warnings={warnings} onSelect={goTo} />
        </VStack>
      }
      previewLabel={t("preview")}
      preview={<ChartPreview chart={chart} />}
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
