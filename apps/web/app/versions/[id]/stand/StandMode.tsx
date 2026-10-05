"use client";

import { chordFormatter, keyName, parse, type Key } from "@chartdown/core";
import { FormStrip, formStripItems, NextSection, Section, type FormStripItem } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { useChartLabels } from "../../../_components/chartLabels";
import type { Display } from "../display";
import { readSection, standHref, type StandTheme } from "./standHref";
import styles from "./stand.module.css";

export interface StandModeProps {
  versionId: string;
  title: string;
  content: string;
  section: number;
  style: Display["style"];
  homeKey: Key;
  theme: StandTheme;
}

const noChanges = () => () => {};

// Keys that page-turner pedals and keyboards send.
const FORWARD = new Set(["ArrowRight", "ArrowDown", "PageDown", " "]);
const BACK = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

/**
 * Stand mode (R-03.3): the current section in chord-xl, the next in chord-sm, and one tap to
 * move on. Every control is a plain link, so it works without JavaScript; with it, moving is
 * instant and the address follows.
 */
export function StandMode({
  versionId,
  title,
  content,
  section: initial,
  style,
  homeKey,
  theme,
}: StandModeProps) {
  const t = useTranslations("stand");
  const c = useTranslations("chart");
  const v = useTranslations("viewer");
  const labels = useChartLabels();
  const chart = useMemo(() => parse(content), [content]);
  const [current, setCurrent] = useState(() => readSection(chart, String(initial + 1)));
  // Whether the browser can go full screen; never on the server.
  const canFullscreen = useSyncExternalStore(
    noChanges,
    () => Boolean(document.documentElement.requestFullscreen),
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const path = `/versions/${versionId}/stand`;
  const display: Display = { style, key: homeKey };
  const formatter = chordFormatter(chart, { style, key: homeKey });
  const last = chart.sections.length - 1;
  const href = (section: number, changes: Partial<{ display: Display; theme: StandTheme }> = {}) =>
    standHref(
      path,
      { section, display: changes.display ?? display, theme: changes.theme ?? theme },
      chart,
    );

  // Moves to a section (or by a step from the current one) and keeps the address in step.
  const move = useCallback(
    (to: (now: number) => number) =>
      setCurrent((now) => {
        const next = Math.min(Math.max(to(now), 0), last);
        window.history.replaceState(
          null,
          "",
          standHref(path, { section: next, display, theme }, chart),
        );
        return next;
      }),
    // display and theme come from the address, so they only change with a new page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [last, path, chart],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea"))
        return;
      if (FORWARD.has(event.key)) {
        event.preventDefault();
        move((now) => now + 1);
      } else if (BACK.has(event.key)) {
        event.preventDefault();
        move((now) => now - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const items = formStripItems(chart, current, () => false).map((item, index) => ({
    ...item,
    href: href(index),
  }));
  const sectionHrefs = items.map((item) => item.href);
  // A link to another section of this song (FormStrip, Previous, Next) moves without a page load.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest("a");
    const section = link ? sectionHrefs.indexOf(link.getAttribute("href") ?? "") : -1;
    if (section < 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    move(() => section);
  };
  const describe = (item: FormStripItem) =>
    [
      item.name,
      labels.length(item.length),
      item.state === "played" ? c("played") : item.state === "current" ? c("now") : "",
    ]
      .filter(Boolean)
      .join(", ");
  const now = chart.sections[current];
  const next = chart.sections[current + 1];
  const written = keyName(chart.key);
  const shown = keyName(homeKey);

  return (
    <div
      ref={root}
      className={styles.stand}
      data-theme={theme === "stage" ? "dark" : "light"}
      onClickCapture={onClickCapture}
    >
      <header className={styles.top}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            {c("key")} <b>{shown}</b>
            {shown !== written && <> {c("writtenIn", { key: written })}</>}
            {chart.header.tempo && (
              <>
                {" · "}
                {c("tempo")} <b>{chart.header.tempo}</b>
              </>
            )}
          </p>
        </div>
        <nav className={styles.tools} aria-label={t("tools")}>
          <Link
            href={href(current, {
              display: { ...display, style: style === "letters" ? "numbers" : "letters" },
            })}
            className={styles.tool}
          >
            {style === "letters" ? v("numbers") : v("letters")}
          </Link>
          <Link
            href={href(current, { theme: theme === "stage" ? "light" : "stage" })}
            className={styles.tool}
          >
            {theme === "stage" ? t("light") : t("stage")}
          </Link>
          {canFullscreen && (
            <button
              type="button"
              className={styles.tool}
              onClick={() =>
                document.fullscreenElement
                  ? void document.exitFullscreen()
                  : void root.current?.requestFullscreen()
              }
            >
              {t("fullscreen")}
            </button>
          )}
          <Link href={`/versions/${versionId}`} className={styles.tool}>
            {t("close")}
          </Link>
        </nav>
      </header>

      <div className={styles.strip}>
        <FormStrip items={items} labels={{ nav: c("songForm"), describe }} />
      </div>

      <main className={styles.current} aria-live="polite">
        {now && (
          <Section
            key={current}
            section={now}
            formatter={formatter}
            labels={labels}
            size="xl"
            id="current-section"
          />
        )}
      </main>

      <div className={styles.next}>
        {next ? (
          <NextSection
            section={next}
            formatter={formatter}
            labels={labels}
            hasNotesForYou={false}
          />
        ) : (
          <p className={styles.end}>{t("end")}</p>
        )}
      </div>

      <nav className={styles.turn} aria-label={t("turn")}>
        {current > 0 ? (
          <a href={href(current - 1)} className={styles.page}>
            {t("previous")}
          </a>
        ) : (
          <span />
        )}
        <span className={styles.position}>
          {t("position", { current: current + 1, total: chart.sections.length })}
        </span>
        {current < last ? (
          <a href={href(current + 1)} className={styles.page}>
            {t("next")}
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
