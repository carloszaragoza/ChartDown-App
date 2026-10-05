"use client";

import { chordFormatter, keyName, parse, type Key } from "@chartdown/core";
import {
  FormStrip,
  formStripItems,
  NextSection,
  Section,
  type FormStripItem,
  type MDNoteData,
} from "@chartdown/ui";
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
  /** Where this stand mode lives; the version's by default. */
  path?: string;
  /** Kept in every address of this page, such as View as (`as=bass`). */
  keep?: Record<string, string>;
  /** In a set (T-802): each section's notes and whether it has notes for this person. */
  notes?: readonly (readonly MDNoteData[])[];
  forYou?: readonly boolean[];
  set?: StandSet;
}

/** A set's stand mode: back to the set, which song this is, View as, and the next songs. */
export interface StandSet {
  href: string;
  name: string;
  songOf: string;
  previousSong?: string;
  nextSong?: string;
  viewAs?: { label: string; options: { label: string; href: string; current: boolean }[] };
}

const noChanges = () => () => {};

/** A link that keeps the section being read, so switching View as stays on it. */
function atSection(href: string, section: number): string {
  if (section === 0) return href;
  return `${href}${href.includes("?") ? "&" : "?"}s=${section + 1}`;
}

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
  path = `/versions/${versionId}/stand`,
  keep = {},
  notes,
  forYou = [],
  set,
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
  const atEdge = useRef({ first: true, last: false });
  const display: Display = { style, key: homeKey };
  const formatter = chordFormatter(chart, { style, key: homeKey });
  const last = chart.sections.length - 1;
  const href = (section: number, changes: Partial<{ display: Display; theme: StandTheme }> = {}) =>
    standHref(
      path,
      { section, display: changes.display ?? display, theme: changes.theme ?? theme },
      chart,
      keep,
    );

  // Moves to a section (or by a step from the current one) and keeps the address in step.
  const move = useCallback(
    (to: (now: number) => number) =>
      setCurrent((now) => {
        const next = Math.min(Math.max(to(now), 0), last);
        window.history.replaceState(
          null,
          "",
          standHref(path, { section: next, display, theme }, chart, keep),
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
        // At a song's edge, the pedal goes on to the next song of the set.
        if (atEdge.current.last && set?.nextSong) window.location.assign(set.nextSong);
        else move((now) => now + 1);
      } else if (BACK.has(event.key)) {
        event.preventDefault();
        if (atEdge.current.first && set?.previousSong) window.location.assign(set.previousSong);
        else move((now) => now - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, set?.nextSong, set?.previousSong]);

  const items = formStripItems(chart, current, (index) => Boolean(forYou[index])).map(
    (item, index) => ({
      ...item,
      href: href(index),
    }),
  );
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
  useEffect(() => {
    atEdge.current = { first: current === 0, last: current === last };
  }, [current, last]);
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
      {/* The top bar of design/screens/02: back to the set or the version, where we are, View as
          in a set, and Previous and Next (T-707). */}
      <nav className={styles.setBar} aria-label={set ? t("setBar") : t("turn")}>
        <div className={styles.setPlace}>
          <Link href={set ? set.href : `/versions/${versionId}`} className={styles.tool}>
            {set ? t("set") : t("close")}
          </Link>
          <span>
            {set && <b className={styles.setName}>{set.name}</b>}
            <span className={styles.meta}>
              {set
                ? set.songOf
                : t("position", { current: current + 1, total: chart.sections.length })}
            </span>
          </span>
        </div>
        <div className={styles.tools}>
          {set?.viewAs && (
            <details className={styles.viewAs}>
              <summary className={styles.viewAsButton}>
                {t("viewAs")} <b>{set.viewAs.label}</b>
              </summary>
              <ul className={styles.viewAsList}>
                {set.viewAs.options.map((option) => (
                  <li key={option.href}>
                    <a
                      href={atSection(option.href, current)}
                      className={styles.tool}
                      aria-current={option.current ? "true" : undefined}
                    >
                      {option.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {current > 0 ? (
            <a href={href(current - 1)} className={styles.tool}>
              {t("previous")}
            </a>
          ) : (
            set?.previousSong && (
              <a href={set.previousSong} className={styles.tool}>
                {t("previousSong")}
              </a>
            )
          )}
          {current < last ? (
            <a href={href(current + 1)} className={`${styles.tool} ${styles.primary}`}>
              {t("next")}
            </a>
          ) : (
            set?.nextSong && (
              <a href={set.nextSong} className={`${styles.tool} ${styles.primary}`}>
                {t("nextSong")}
              </a>
            )
          )}
        </div>
      </nav>
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
            {...(notes ? { notes: notes[current] ?? [] } : {})}
          />
        )}
      </main>

      <div className={styles.next}>
        {next ? (
          <NextSection
            section={next}
            formatter={formatter}
            labels={labels}
            hasNotesForYou={Boolean(forYou[current + 1])}
          />
        ) : (
          <p className={styles.end}>{t("end")}</p>
        )}
      </div>
    </div>
  );
}
