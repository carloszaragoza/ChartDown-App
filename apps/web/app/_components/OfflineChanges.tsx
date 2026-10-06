"use client";

import { Button } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { Change } from "../../lib/offline/changes";
import { changesFor, dismissChanges, SYNCED } from "../../lib/offline/store";

/**
 * “This set changed while you were offline” (R-08.3, T-903): what changed since the set was
 * downloaded, until the person dismisses it.
 */
export function OfflineChanges({ setId }: { setId: string }) {
  const t = useTranslations("offline");
  const [changes, setChanges] = useState<Change[]>([]);
  const load = useCallback(() => void changesFor(setId).then(setChanges), [setId]);

  useEffect(() => {
    load();
    window.addEventListener(SYNCED, load);
    return () => window.removeEventListener(SYNCED, load);
  }, [load]);

  if (changes.length === 0) return null;
  const describe = (change: Change): string => {
    switch (change.kind) {
      case "name":
        return t("changes.name", { from: change.from, to: change.to });
      case "when":
        return t("changes.when", {
          from: change.from ?? t("changes.none"),
          to: change.to ?? t("changes.none"),
        });
      case "songAdded":
      case "songRemoved":
        return t(`changes.${change.kind}`, { title: change.title });
      case "songMoved":
        return t("changes.songMoved", { title: change.title, from: change.from, to: change.to });
      case "key":
        return t("changes.key", {
          title: change.title,
          from: change.from ?? t("changes.written"),
          to: change.to ?? t("changes.written"),
        });
      case "revision":
        return t("changes.revision", { title: change.title, from: change.from, to: change.to });
      case "noteAdded":
      case "noteChanged":
      case "noteRemoved":
        return t(`changes.${change.kind}`, {
          title: change.title,
          section: change.section,
          text: change.text,
        });
      case "lineup":
        return t("changes.lineup", {
          name: change.name,
          to: change.to.length > 0 ? change.to.join(", ") : t("changes.sitsOut"),
        });
    }
  };
  return (
    <section
      aria-labelledby="offline-changes"
      style={{
        display: "grid",
        gap: "var(--space-2)",
        padding: "var(--space-4)",
        border: "var(--stroke-hairline) solid var(--ink)",
        borderRadius: "var(--radius-sm)",
        background: "var(--paper)",
      }}
    >
      <h2 id="offline-changes" style={{ margin: 0, font: "var(--type-label)" }}>
        {t("changedTitle")}
      </h2>
      <ul style={{ margin: 0, paddingLeft: "var(--space-6)", font: "var(--type-note)" }}>
        {changes.map((change, index) => (
          <li key={index}>{describe(change)}</li>
        ))}
      </ul>
      <div>
        <Button type="button" onClick={() => void dismissChanges(setId).then(() => setChanges([]))}>
          {t("gotIt")}
        </Button>
      </div>
    </section>
  );
}
