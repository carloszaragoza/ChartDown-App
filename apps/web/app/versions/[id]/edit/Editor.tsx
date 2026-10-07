"use client";

import { parse, SUPPORTED_VERSION, type Warning } from "chartdown";
import { Button, Icon } from "@chartdown/ui";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { lineRange } from "../../../../lib/versions/lines";
import { ChartBody } from "../ChartBody";
import { saveChart, type SaveState } from "./actions";
import styles from "./editor.module.css";

export interface EditorProps {
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
 * The chart editor (R-03.1): text on the left, a live preview on the right that follows the
 * typing without reloading, and the parser's warnings with their lines. Warnings never block a
 * save.
 */
export function Editor({
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
  const area = useRef<HTMLTextAreaElement>(null);
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

  const goTo = (line: number) => {
    const field = area.current;
    if (!field) return;
    const { start, end } = lineRange(field.value, line);
    field.focus();
    field.setSelectionRange(start, end);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            {t("savedLine", {
              source,
              number: saved.number,
              when: format.relativeTime(new Date(saved.at), now),
            })}{" "}
            ·{" "}
            <Link href={`/versions/${versionId}`} className={styles.metaLink}>
              {t("view")}
            </Link>
          </p>
        </div>
        <form action={action} className={styles.actions}>
          <input type="hidden" name="versionId" value={versionId} />
          <input type="hidden" name="content" value={text} />
          {/* Public or private; going private is its own flow (R-02.4) and has no way back. */}
          <div className={styles.segmented} role="group" aria-label={t("visibility")}>
            {visibility === "public" ? (
              <>
                <span className={styles.segment} aria-current="true">
                  <Icon name="public" size={18} />
                  {t("public")}
                </span>
                <Link href={`/versions/${versionId}/make-private`} className={styles.segment}>
                  <Icon name="private" size={18} />
                  {v("private")}
                </Link>
              </>
            ) : (
              <span className={styles.segment} aria-current="true">
                <Icon name="private" size={18} />
                {v("private")}
              </span>
            )}
          </div>
          <Link href={`/versions/${versionId}/history`} className="cd-button cd-button--secondary">
            <Icon name="history" size={20} />
            {v("history")}
          </Link>
          <Button
            type="submit"
            variant="primary"
            {...(!dirty ? { disabledReason: t("noChanges") } : {})}
            {...(pending ? { disabledReason: t("saving") } : {})}
          >
            {t("save")}
          </Button>
        </form>
      </header>
      <p role="status" className={styles.status}>
        {state.status === "saved" && !dirty && t("saved", { number: state.number ?? "" })}
      </p>
      {(state.status === "changed" || state.status === "error") && (
        <p role="alert" className={styles.alert}>
          {state.status === "changed" ? t("changed") : t("error")}
        </p>
      )}

      <div className={styles.panes}>
        <div className={styles.source}>
          <div className={styles.sourceBar}>
            <span>ChartDown {chart.version ?? SUPPORTED_VERSION}</span>
            <span>{t("numbers")}</span>
          </div>
          <textarea
            id="chart-source"
            aria-label={t("text")}
            ref={area}
            className={styles.text}
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-describedby="chart-warnings"
          />
          <Warnings warnings={chart.warnings} onSelect={goTo} />
        </div>
        <section className={styles.preview} aria-label={t("preview")}>
          <ChartBody chart={chart} />
        </section>
      </div>
    </div>
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
  return (
    <div id="chart-warnings" className={styles.warnings}>
      <h2 className={styles.label}>
        {warnings.length === 0 && <Icon name="check" size={16} />}
        {t("warnings", { count: warnings.length })}
      </h2>
      {warnings.length > 0 && (
        <ul className={styles.warningList}>
          {warnings.map((warning, index) => (
            <li key={index}>
              <button
                type="button"
                className={styles.warning}
                onClick={() => onSelect?.(warning.line)}
              >
                <span className={styles.line}>{t("line", { line: warning.line })}</span>{" "}
                {message(warning)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
