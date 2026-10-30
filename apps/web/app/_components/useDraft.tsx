"use client";

import { Banner } from "./Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { forgetDraft, isOffered, readDraft, writeDraft, type Draft } from "../../lib/drafts";

// A moment after the last change, so typing isn't slowed by it.
const KEEP_AFTER_MS = 600;

/**
 * Autosave in an editor (R-02.12, T-3022): the chart being written is kept in this browser a
 * moment after each change, and on leaving the page; what was kept and not saved is offered when
 * the editor opens again. While it is offered nothing new is kept, so it is never overwritten
 * before the author chooses.
 */
export function useDraft({
  versionId,
  revisionId,
  opened,
  current,
  isDirty,
}: {
  versionId: string;
  /** The revision the editor opened. */
  revisionId: string;
  /** The chart's text as the editor opened it. */
  opened: string;
  /** The chart's text as Save would send it now. */
  current: string;
  isDirty: boolean;
}) {
  const [offered, setOffered] = useState<Draft | null>(null);
  const [isChosen, setChosen] = useState(false);
  const [keptAt, setKeptAt] = useState<number | null>(null);

  // Read once the page is in the browser: the server has no storage, so the first render matches.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readDraft(versionId);
      if (isOffered(draft, opened)) setOffered(draft);
      else {
        if (draft) forgetDraft(versionId);
        setChosen(true);
      }
    });
    return () => window.clearTimeout(timer);
  }, [versionId, opened]);

  // Saved, or taken back to what was saved: nothing to keep.
  useEffect(() => {
    if (!isChosen) return;
    if (!isDirty) {
      forgetDraft(versionId);
      return;
    }
    const timer = window.setTimeout(() => {
      const at = Date.now();
      writeDraft(versionId, { content: current, base: revisionId, at });
      setKeptAt(at);
    }, KEEP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [isChosen, isDirty, current, versionId, revisionId]);

  // Leaving the page, or the tab going to the background, keeps the last change at once.
  const latest = useRef({ isChosen, isDirty, current, versionId, revisionId });
  useEffect(() => {
    latest.current = { isChosen, isDirty, current, versionId, revisionId };
  });
  useEffect(() => {
    const keep = () => {
      const now = latest.current;
      if (now.isChosen && now.isDirty)
        writeDraft(now.versionId, { content: now.current, base: now.revisionId, at: Date.now() });
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") keep();
    };
    window.addEventListener("pagehide", keep);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", keep);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  return {
    offered,
    keptAt: isDirty ? keptAt : null,
    /** The draft to put back; the editor puts it back as one step. */
    restore: (): Draft | null => {
      const draft = offered;
      setOffered(null);
      setChosen(true);
      return draft;
    },
    discard: () => {
      forgetDraft(versionId);
      setOffered(null);
      setChosen(true);
    },
  };
}

/** The changes kept and not saved, offered when the editor opens (R-02.12). */
export function DraftBanner({
  draft,
  revisionId,
  onRestore,
  onDiscard,
}: {
  draft: Draft;
  revisionId: string;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("drafts");
  const format = useFormatter();
  const when = format.dateTime(new Date(draft.at), { dateStyle: "medium", timeStyle: "short" });
  return (
    <Banner
      status="info"
      title={t("title", { when })}
      description={draft.base === revisionId ? t("body") : t("savedSince")}
      endContent={
        <HStack gap={2}>
          <Button label={t("discard")} variant="secondary" size="sm" onClick={onDiscard} />
          <Button label={t("restore")} variant="primary" size="sm" onClick={onRestore} />
        </HStack>
      }
    />
  );
}

/** "Kept on this device · 3:42 PM", beside Save while there are changes (R-02.12). */
export function DraftStatus({ keptAt }: { keptAt: number | null }) {
  const t = useTranslations("drafts");
  const format = useFormatter();
  if (keptAt === null) return null;
  return (
    <Text type="supporting" role="status">
      {t("kept", { when: format.dateTime(new Date(keptAt), { timeStyle: "short" }) })}
    </Text>
  );
}
