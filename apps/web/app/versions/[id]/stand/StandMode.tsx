"use client";

import { Theme } from "@astryxdesign/core";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { VStack } from "@astryxdesign/core/VStack";
import { chartdownStandTheme } from "../../../../theme/chartdown-stand";
import { chordFormatter, keyName, parse, type Key } from "chartdown";
import { formStripItems, type FormStripItem, type MDNoteData } from "@chartdown/ui";
import {
  AdjustmentsHorizontalIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePhone, useShortScreen } from "../../../../lib/shell/phone";
import { prefetchWhole } from "../../../../lib/shell/prefetch";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { ChartSection } from "../../../_components/ChartPreview";
import { useMetronomeControls } from "../../../_components/MetronomeControls";
import { SongForm } from "../../../_components/SongForm";
import { BeatsControl } from "../../../_components/BeatsControl";
import { barIn, usePlaybackBar } from "../../../_components/usePlaybackBar";
import { copyAt } from "../../../../lib/chart/copies";
import { glide, nearestCard, stackTarget, type StandMotion } from "../../../../lib/stand/motion";
import { barProgress } from "../../../../lib/stand/progress";
import {
  standPreferences,
  upcomingSections,
  type ComingUp,
  type NumberSize,
} from "../../../../lib/stand/preferences";
import { useChartLabels } from "../../../_components/chartLabels";
import { DockRoom } from "../../../_components/DockRoom";
import type { Display } from "../display";
import { inSidewaysScroll, swipeTurn } from "./swipe";
import {
  readSection,
  songsAhead,
  standHref,
  withView,
  type StandTheme,
  type StandView,
} from "./standHref";

export interface StandModeProps {
  versionId: string;
  title: string;
  content: string;
  section: number;
  style: Display["style"];
  homeKey: Key;
  /** How many bars show beat marks (R-03.7); Auto by default. */
  beats?: Display["beats"];
  theme: StandTheme;
  /** Where this stand mode lives; the version's by default. */
  path?: string;
  /** Kept in every address of this page, such as View as (`as=bass`). */
  keep?: Record<string, string>;
  /** In a set (T-802): each section's notes and whether it has notes for this person. */
  notes?: readonly (readonly MDNoteData[])[];
  forYou?: readonly boolean[];
  set?: StandSet;
  /** The band's recording's play button, in a set (R-06.7). */
  audio?: ReactNode;
  /** The server's guess that this is a phone (R-03.8); the screen decides once it is drawn. */
  phone?: boolean;
}

/** A set's stand mode: back to the set, which song this is, View as, and the next songs. */
export interface StandSet {
  href: string;
  name: string;
  songOf: string;
  previousSong?: string;
  nextSong?: string;
  viewAs?: { label: string; options: ViewAsOption[] };
}

/**
 * One View as, with its notes when the server sent them all at once (F-006): each one is
 * filtered on the server as that instrument receives it, so switching needs no trip there.
 */
export interface ViewAsOption {
  label: string;
  href: string;
  current: boolean;
  as?: string | null;
  notes?: readonly (readonly MDNoteData[])[];
  forYou?: readonly boolean[];
}

const noChanges = () => () => {};

/** A link that keeps the section being read, so switching View as stays on it. */
function atSection(href: string, section: number): string {
  if (section === 0) return href;
  return `${href}${href.includes("?") ? "&" : "?"}s=${section + 1}`;
}

// Keys that page-turner pedals and keyboards send.
const FORWARD = new Set(["ArrowRight", "ArrowDown", "PageDown"]);
const BACK = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

/**
 * Stand mode (R-03.3, R-03.12): every section stacked in order, the current one at the top of the
 * stack, and one tap to move on. Every control is a plain link, so it works without JavaScript;
 * with it, moving is instant and the address follows. Another song, or another View as, starts
 * afresh: the router keeps the page, so its state would carry over.
 */

export function StandMode(props: StandModeProps) {
  const place = new URLSearchParams(props.keep ?? {}).toString();
  return <StandModeView key={`${props.path ?? props.versionId}?${place}`} {...props} />;
}

function StandModeView({
  versionId,
  title,
  content,
  section: initial,
  style: initialStyle,
  homeKey,
  beats: initialBeats = "auto",
  theme: initialTheme,
  path = `/versions/${versionId}/stand`,
  keep: keepGiven = {},
  notes: notesGiven,
  forYou: forYouGiven = [],
  set,
  phone: phoneGuess = false,
  audio,
}: StandModeProps) {
  const t = useTranslations("stand");
  const c = useTranslations("chart");
  const v = useTranslations("viewer");
  const labels = useChartLabels();
  const router = useRouter();
  const chart = useMemo(() => parse(content), [content]);
  // A phone gets one compact bar and a View sheet, so the chart comes first (R-03.8).
  const isPhone = usePhone(phoneGuess);
  // Held sideways, the song form joins the top bar, so the bars get the height (R-03.8).
  const isSideways = useShortScreen() && isPhone;
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [current, setCurrent] = useState(() => readSection(chart, String(initial + 1)));
  // The visual metronome (R-11.1 to R-11.5): it plays from the section being read, and the
  // section follows it.
  const {
    playButton,
    control,
    soundControls,
    tempoDialog,
    counter,
    nowIn,
    playingSection,
    playingAt,
    isCountingIn,
    metronome: { bars: timelineBars },
    queued,
    queue,
    isPlaying,
    isWaiting,
    toggle,
    resume,
    chooseStart,
    startIn,
  } = useMetronomeControls(chart, current);
  // Numbers or letters, Beats and the theme change here at once, with no trip to the server
  // (F-005); the address follows, so a reload or a shared link shows the same.
  const [view, setView] = useState<StandView>({
    style: initialStyle,
    beats: initialBeats,
    theme: initialTheme,
    as: keepGiven.as ?? null,
  });
  // View as switches here too when the server sent every view (F-006).
  const viewAs = set?.viewAs;
  const chosenView = viewAs?.options.find((option) => (option.as ?? null) === view.as);
  const notes = chosenView?.notes ?? notesGiven;
  const forYou = chosenView?.forYou ?? forYouGiven;
  const kept = Object.fromEntries(Object.entries(keepGiven).filter(([name]) => name !== "as"));
  const keep: Record<string, string> = view.as ? { ...kept, as: view.as } : kept;
  const { style, beats, theme } = view;
  const changeView = (changes: Partial<StandView>) => setView((now) => ({ ...now, ...changes }));
  // Whether the browser can go full screen; never on the server.
  const canFullscreen = useSyncExternalStore(
    noChanges,
    () => Boolean(document.documentElement.requestFullscreen),
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const preferences = useSyncExternalStore(
    standPreferences.subscribe,
    standPreferences.get,
    standPreferences.server,
  );
  // Stand mode asks for full screen when it opens, where the browser allows it (R-03.12): most
  // allow it only right after a tap, such as the one that opened it.
  useEffect(() => {
    if (!document.fullscreenElement && root.current?.requestFullscreen)
      root.current.requestFullscreen().catch(() => {});
  }, []);
  const atEdge = useRef({ first: true, last: false });
  const display: Display = { style, key: homeKey, beats };
  const formatter = chordFormatter(chart, { style, key: homeKey });
  const last = chart.sections.length - 1;
  const href = (section: number, changes: Partial<{ display: Display; theme: StandTheme }> = {}) =>
    standHref(
      path,
      { section, display: changes.display ?? display, theme: changes.theme ?? theme },
      chart,
      keep,
    );

  // Moves to a section, or by a step from the current one.
  const move = useCallback(
    (to: (now: number) => number) => setCurrent((now) => Math.min(Math.max(to(now), 0), last)),
    [last],
  );
  // Playing, the section follows the metronome (R-11.4): when it enters another section, stand
  // mode turns to it; in between, the musician may look ahead.
  // The band's recording, playing, is followed the same way (R-06.7).
  const playbackBar = usePlaybackBar(chart, isPlaying);
  const leading = playingSection ?? playbackBar?.section;
  const [followed, setFollowed] = useState(leading);
  if (leading !== followed) {
    setFollowed(leading);
    if (leading !== undefined) setCurrent(leading);
  }

  // The address follows the section and the view.
  useEffect(() => {
    const address = standHref(
      path,
      { section: current, display: { style, key: homeKey, beats }, theme },
      chart,
      keep,
    );
    if (`${window.location.pathname}${window.location.search}` !== address)
      window.history.replaceState(null, "", address);
    // keep is a new object on every render with the same values; path names them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, style, beats, theme, view.as, homeKey, path, chart]);

  // The songs at a set's edges carry the view as it is now, and the one the pedal leads to next
  // is loaded ahead, whole, so moving on is instant (F-005, F-006).
  const previousSong = set?.previousSong && withView(set.previousSong, view);
  const nextSong = set?.nextSong && withView(set.nextSong, view);
  const ahead = songsAhead(current, last, { previousSong, nextSong }).join(" ");
  useEffect(() => {
    for (const song of ahead.split(" ").filter(Boolean)) prefetchWhole(router, song);
  }, [ahead, router]);

  // Playing, a turn queues the section after (or before) the one already coming, so a pedal
  // pressed twice skips two; the screen stays on what sounds (R-11.15).
  const lead = useCallback(
    (step: number) => {
      const from = queued ?? playingSection ?? current;
      const to = from + step;
      if (to >= 0 && to <= last && to !== queued) queue(to);
    },
    [queued, playingSection, current, last, queue],
  );
  // On, and back: at a song's edge, the pedal and a swipe go on to the set's next song.
  const forward = useCallback(() => {
    if (isPlaying) lead(1);
    else if (atEdge.current.last && nextSong) router.push(nextSong);
    else if (atEdge.current.last) move(() => 0);
    else move((now) => now + 1);
  }, [isPlaying, lead, move, nextSong, router]);
  const backward = useCallback(() => {
    if (isPlaying) lead(-1);
    else if (atEdge.current.first && previousSong) router.push(previousSong);
    else move((now) => now - 1);
  }, [isPlaying, lead, move, previousSong, router]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea"))
        return;
      // The space bar plays and stops (R-11.10); on a focused button it presses that button.
      if (event.key === " ") {
        if (event.target instanceof HTMLElement && event.target.closest("button, a")) return;
        event.preventDefault();
        if (isWaiting) resume();
        else toggle();
      } else if (FORWARD.has(event.key)) {
        event.preventDefault();
        forward();
      } else if (BACK.has(event.key)) {
        event.preventDefault();
        backward();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forward, backward, toggle, isWaiting, resume]);

  // A sideways swipe on the chart turns the section, on an iPad or a phone (R-03.3); a vertical
  // drag still scrolls it, and a row that scrolls sideways itself keeps its own swipe.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    const finger = event.touches[0];
    touch.current =
      event.touches.length === 1 && finger && !inSidewaysScroll(event.target, event.currentTarget)
        ? { x: finger.clientX, y: finger.clientY }
        : null;
  };
  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touch.current;
    const finger = event.changedTouches[0];
    touch.current = null;
    if (!start || !finger) return;
    const turn = swipeTurn(finger.clientX - start.x, finger.clientY - start.y);
    if (turn === "next") forward();
    else if (turn === "previous") backward();
  };

  const items = formStripItems(chart, current, (index) => Boolean(forYou[index])).map(
    (item, index) => ({
      ...item,
      href: href(index),
    }),
  );
  const sectionHrefs = items.map((item) => item.href);
  const otherStyle = style === "letters" ? "numbers" : "letters";
  const otherTheme = theme === "stage" ? "light" : "stage";
  const styleHref = href(current, { display: { ...display, style: otherStyle } });
  const themeHref = href(current, { theme: otherTheme });
  // A link to another section of this song (FormStrip, Previous, Next) moves without a page
  // load, and numbers or letters and the theme change in place (F-005).
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const to = link.getAttribute("href") ?? "";
    const section = sectionHrefs.indexOf(to);
    // Playing, the song form queues a section (the same one repeats it, the queued one cancels
    // it), and Previous and Next queue the one before or after (R-11.15).
    if (section >= 0 && isPlaying) {
      if (link.closest(`nav[aria-label="${c("songForm")}"]`)) queue(section);
      else lead(section > current ? 1 : -1);
    } else if (section >= 0) move(() => section);
    else if (to === styleHref) changeView({ style: otherStyle });
    else if (to === themeHref) changeView({ theme: otherTheme });
    else return;
    event.preventDefault();
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
  // What comes next: the queued section while the metronome plays, the following one otherwise.
  const nextIndex = queued ?? current + 1;
  const next = chart.sections[nextIndex];
  // A section reused with a count says so, and which time is playing (T-2704).
  const timesOf = (section: number) => {
    const count = chart.sections[section]?.use?.times ?? 1;
    if (count < 2) return undefined;
    const at =
      playingSection === section
        ? playingAt
        : playbackBar?.section === section
          ? playbackBar.at
          : undefined;
    return at !== undefined
      ? t("timeOf", { time: copyAt(timelineBars, at), count })
      : t("times", { count });
  };
  const again = queued !== null && queued === playingSection;
  // The cards in the order they will be played: the played ones, the current one, then what comes
  // next, from the queued section when there is one (T-2804, R-11.15); Coming up keeps one, two
  // or all of them (T-2805).
  const cards = [
    ...Array.from({ length: current + 1 }, (_, index) => index),
    ...upcomingSections(current, last, queued, preferences.comingUp),
  ];
  // While the metronome plays, which bar of the current section sounds (T-2804).
  const progress =
    playingAt !== undefined && playingSection === current
      ? barProgress(timelineBars, playingAt)
      : undefined;
  const written = keyName(chart.key);
  const shown = keyName(homeKey);

  const chooseView = (label: string) => {
    const option = viewAs?.options.find((item) => item.label === label);
    if (!option || option === chosenView) return;
    if (option.notes) changeView({ as: option.as ?? null });
    else router.push(atSection(withView(option.href, view), current));
  };

  const songTokens = (
    <>
      <Token label={`${c("key")} ${shown}`} size="sm" />
      {shown !== written && <Token label={c("writtenIn", { key: written })} size="sm" />}
      {chart.header.meter && <Token label={chart.header.meter} size="sm" />}
      {chart.header.tempo && <Token label={`${chart.header.tempo} bpm`} size="sm" />}
    </>
  );
  // View as: a segmented control in the phone's View sheet; a compact menu on the top line of an
  // iPad, so the song's name keeps its room in portrait (T-2706).
  const viewAsValue = (chosenView ?? viewAs?.options.find((option) => option.current))?.label ?? "";
  const viewAsControl =
    viewAs &&
    (isPhone ? (
      <SegmentedControl label={t("viewAs")} value={viewAsValue} onChange={chooseView}>
        {viewAs.options.map((option) => (
          <SegmentedControlItem key={option.href} value={option.label} label={option.label} />
        ))}
      </SegmentedControl>
    ) : (
      <Selector
        label={t("viewAs")}
        isLabelHidden
        size="lg"
        options={viewAs.options.map((option) => ({ value: option.label, label: option.label }))}
        value={viewAsValue}
        onChange={chooseView}
      />
    ));
  // View (R-03.12, T-2805): what is set once, each choice with its name above it. Numbers or
  // letters, Beat marks and the screen live in the address; Coming up, the motion and the number
  // size are kept on the device.
  const choice = (
    name: string,
    value: string,
    options: readonly (readonly [string, string])[],
    onChange: (value: string) => void,
  ) => (
    <VStack gap={1}>
      <Text type="label">{name}</Text>
      <SegmentedControl label={name} value={value} onChange={onChange}>
        {options.map(([option, label]) => (
          <SegmentedControlItem key={option} value={option} label={label} />
        ))}
      </SegmentedControl>
    </VStack>
  );
  const tools = (
    <VStack gap={4}>
      {choice(
        t("chartChoice"),
        style,
        [
          ["numbers", v("numbers")],
          ["letters", v("letters")],
        ],
        (chosen) => changeView({ style: chosen === "letters" ? "letters" : "numbers" }),
      )}
      <BeatsControl
        value={beats}
        hrefs={{
          off: href(current, { display: { ...display, beats: "off" } }),
          auto: href(current, { display: { ...display, beats: "auto" } }),
          always: href(current, { display: { ...display, beats: "always" } }),
        }}
        onChoose={(mode) => changeView({ beats: mode })}
        words={{
          label: c("beatsLabel"),
          name: c("beatsName"),
          off: c("beatsOff"),
          auto: c("beatsAuto"),
          always: c("beatsAlways"),
          help: { about: c("beatsAbout"), text: c("beatsHelp") },
        }}
      />
      {choice(
        t("comingUp"),
        preferences.comingUp,
        [
          ["1", t("comingUpOne")],
          ["2", t("comingUpTwo")],
          ["fill", t("comingUpFill")],
        ],
        (chosen) => standPreferences.set({ comingUp: chosen as ComingUp }),
      )}
      {choice(
        t("motion"),
        preferences.motion,
        [
          ["calm", t("motionCalm")],
          ["bounce", t("motionBounce")],
        ],
        (chosen) => standPreferences.set({ motion: chosen as StandMotion }),
      )}
      {choice(
        t("screen"),
        theme,
        [
          ["light", t("light")],
          ["stage", t("stage")],
        ],
        (chosen) => changeView({ theme: chosen === "stage" ? "stage" : "light" }),
      )}
      {choice(
        t("numberSize"),
        preferences.size,
        [
          ["sm", t("sizeSmall")],
          ["md", t("sizeMedium")],
          ["lg", t("sizeLarge")],
        ],
        (chosen) => standPreferences.set({ size: chosen as NumberSize }),
      )}
      {canFullscreen && (
        <Button
          label={t("fullscreen")}
          variant="secondary"
          onClick={() =>
            document.fullscreenElement
              ? void document.exitFullscreen()
              : void root.current?.requestFullscreen()
          }
        />
      )}
    </VStack>
  );
  const songForm = (
    <SongForm
      label={c("songForm")}
      size="lg"
      current={current}
      notesLabel={labels.notesForYou}
      isStrip={isPhone}
      items={items.map((item, index) => ({
        abbreviation: item.abbreviation,
        description: describe(item),
        href: item.href,
        hasNotes: item.hasNotes,
        isQueued: index === queued,
      }))}
    />
  );

  const back = {
    label: set ? t("set") : t("close"),
    href: set ? set.href : `/versions/${versionId}`,
  };
  const position = t("position", { current: current + 1, total: chart.sections.length });
  const previous =
    current > 0
      ? { label: t("previous"), href: href(current - 1) }
      : previousSong
        ? { label: t("previousSong"), href: previousSong }
        : undefined;
  // On the last section Next goes on to the set's next song, or back to the first (R-03.12).
  const following =
    current < last
      ? { label: t("next"), href: href(current + 1) }
      : nextSong
        ? { label: t("nextSong"), href: nextSong }
        : last > 0
          ? { label: t("fromTop"), href: href(0) }
          : undefined;

  // The stack (R-03.12, T-2803): the current section glides to the top, the active zone; a scroll
  // that settles makes the section nearest the top the current one, unless the metronome plays,
  // when a scroll only looks ahead.
  const stack = useRef<HTMLElement>(null);
  const stopGlide = useRef<(() => void) | null>(null);
  const isGliding = useRef(false);
  const settledOn = useRef<number | null>(null);
  const hasGlided = useRef(false);
  const settleTimer = useRef(0);
  const live = useRef({ current, isPlaying, motion: preferences.motion });
  useEffect(() => {
    live.current = { current, isPlaying, motion: preferences.motion };
  }, [current, isPlaying, preferences.motion]);
  useEffect(() => {
    const box = stack.current;
    const card = box?.querySelector<HTMLElement>(`[data-card="${current}"]`);
    if (!box || !card) return;
    if (settledOn.current === current) {
      settledOn.current = null;
      return;
    }
    stopGlide.current?.();
    isGliding.current = true;
    const instant =
      !hasGlided.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hasGlided.current = true;
    const to = stackTarget({
      cardTop: card.getBoundingClientRect().top,
      stackTop: box.getBoundingClientRect().top,
      scrollTop: box.scrollTop,
      maxScroll: box.scrollHeight - box.clientHeight,
      margin: parseFloat(getComputedStyle(card).scrollMarginTop) || 0,
    });
    stopGlide.current = glide(box, to, {
      motion: live.current.motion,
      instant,
      onDone: () => {
        isGliding.current = false;
      },
    });
  }, [current]);
  useEffect(
    () => () => {
      stopGlide.current?.();
      window.clearTimeout(settleTimer.current);
    },
    [],
  );
  const onStackScroll = () => {
    if (isGliding.current) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const box = stack.current;
      if (!box || isGliding.current || live.current.isPlaying) return;
      const cards = [...box.querySelectorAll<HTMLElement>("[data-card]")];
      const first = cards[0];
      const zone =
        box.getBoundingClientRect().top +
        (first ? parseFloat(getComputedStyle(first).scrollMarginTop) || 0 : 0);
      const card =
        cards[
          nearestCard(
            cards.map((each) => each.getBoundingClientRect().top),
            zone,
          )
        ];
      const index = Number(card?.dataset.card);
      if (card && index !== live.current.current) {
        settledOn.current = index;
        setCurrent(index);
      }
    }, 120);
  };
  // A tap on another section makes it current, or queues it while the metronome plays; on the
  // current one a tapped bar is where Play starts (R-11.2), and after a fermata it goes on (R-11.6).
  const onCard = (index: number, event: MouseEvent<HTMLElement>) => {
    if (isWaiting) return resume();
    if (index !== current) {
      if (isPlaying) queue(index);
      else move(() => index);
      return;
    }
    const bar = (event.target as HTMLElement).closest<HTMLElement>(".cd-chart__bar");
    if (!isPlaying && bar) chooseStart(current, Number(bar.dataset.bar));
  };

  return (
    <div ref={root} onClickCapture={onClickCapture}>
      <Theme theme={chartdownStandTheme} mode={theme === "stage" ? "dark" : "light"}>
        {/* Stand mode fills the screen in its own mode (light or stage), so it paints its own
            background from that mode's tokens. */}
        <div
          data-stand={theme}
          style={{ background: "var(--color-background-body)", color: "var(--color-text-primary)" }}
        >
          <VStack height="100dvh" gap={3} padding={4}>
            {isPhone ? (
              // One line on a phone: back, the song and where we are, View, Previous and Next
              // (design handoff 5). The rest is in the View sheet.
              <nav aria-label={set ? t("setBar") : t("turn")}>
                <HStack gap={2} vAlign="center">
                  <Button
                    label={back.label}
                    href={back.href}
                    as={Link}
                    variant="ghost"
                    size="lg"
                    isIconOnly
                    icon={<Icon icon={ArrowUturnLeftIcon} />}
                  />
                  {isSideways ? (
                    // Sideways the song's name moves to the View sheet and the song form
                    // takes its place.
                    <StackItem size="fill">{songForm}</StackItem>
                  ) : (
                    <StackItem size="fill">
                      <VStack gap={0}>
                        <Heading level={4} accessibilityLevel={1} maxLines={1}>
                          {title}
                        </Heading>
                        <Text type="supporting" maxLines={1}>
                          {counter ?? (set ? `${set.songOf} · ${position}` : position)}
                        </Text>
                      </VStack>
                    </StackItem>
                  )}
                  <Button
                    label={t("viewOptions")}
                    variant="secondary"
                    size="lg"
                    isIconOnly
                    icon={<Icon icon={AdjustmentsHorizontalIcon} />}
                    onClick={() => setSheetOpen(true)}
                  />
                  {/* Play takes Previous's place: a swipe to the right goes back (R-03.3). */}
                  {audio}
                  {playButton}
                  {following && (
                    <Button
                      label={following.label}
                      href={following.href}
                      size="lg"
                      variant="primary"
                      isIconOnly
                      icon={<Icon icon={ChevronRightIcon} />}
                    />
                  )}
                </HStack>
              </nav>
            ) : (
              <>
                {/* One line (T-2706), in portrait and landscape: the way back with the song
                  beside it, then View as for the MD, View and the metronome. What is set once
                  (Letters, Beats, Stage, Full screen) is in View. */}
                <nav aria-label={set ? t("setBar") : t("turn")}>
                  <HStack gap={3} vAlign="center">
                    {/* The way back is quiet: used once, at the end, so the song's title leads the
                      line (T-2810); it keeps the large touch size. */}
                    <Button
                      label={back.label}
                      href={back.href}
                      as={Link}
                      variant="ghost"
                      size="lg"
                      isIconOnly
                      tooltip={back.label}
                      icon={<Icon icon={set ? ArrowUturnLeftIcon : XMarkIcon} />}
                    />
                    <StackItem size="fill">
                      <VStack gap={0}>
                        {set && (
                          <Text type="supporting" maxLines={1}>
                            {set.name} · {set.songOf}
                          </Text>
                        )}
                        <Heading level={1} maxLines={1}>
                          {title}
                        </Heading>
                        <Text type="supporting" maxLines={1}>
                          {[
                            `${c("key")} ${shown}`,
                            shown !== written ? c("writtenIn", { key: written }) : null,
                            chart.header.meter,
                            chart.header.tempo ? `${c("tempo")} ${chart.header.tempo}` : null,
                            position,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </VStack>
                    </StackItem>
                    {viewAsControl}
                    <Button
                      label={t("viewOptions")}
                      variant="secondary"
                      size="lg"
                      icon={<Icon icon={AdjustmentsHorizontalIcon} />}
                      onClick={() => setSheetOpen(true)}
                    >
                      {t("view")}
                    </Button>
                    {!isPlaying && counter && (
                      <Text type="large" weight="bold">
                        {counter}
                      </Text>
                    )}
                    {audio}
                    {control}
                  </HStack>
                </nav>
                {songForm}
              </>
            )}

            {isPhone && !isSideways && songForm}

            {/* Every section in order, the current one at the top of the stack, the played ones
              above it, dimmed; each card keeps one size, so only its color shows where we are
              (R-03.12). */}
            <main
              ref={stack}
              className="cd-stand-stack"
              data-size={preferences.size}
              onScroll={onStackScroll}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <ol className="cd-stand-stack__list">
                {cards.map((index, place) => {
                  const section = chart.sections[index];
                  if (!section) return null;
                  const isCurrent = place === current;
                  // A section queued again, or one already played, shows a second time ahead.
                  const isAgain = place > current && index <= current;
                  return (
                    <li
                      key={isAgain ? `again-${index}` : index}
                      className="cd-stand-card"
                      data-card={index}
                      data-state={place < current ? "past" : isCurrent ? "current" : "upcoming"}
                      {...(isCurrent ? { "aria-current": "true" as const } : {})}
                      onClick={(event) => onCard(index, event)}
                    >
                      <ChartSection
                        section={section}
                        formatter={formatter}
                        labels={labels}
                        notes={notes ? (notes[index] ?? []) : section.notes}
                        {...(isCurrent ? { id: "current-section" } : {})}
                        meter={chart.meter}
                        beats={beats}
                        size="lg"
                        now={isAgain ? undefined : (nowIn(index) ?? barIn(playbackBar, index))}
                        start={isAgain ? undefined : startIn(index)}
                        times={timesOf(index)}
                        badge={
                          isCurrent ? (
                            <span className="cd-stand-card__now">
                              {isCountingIn ? t("countInTag") : t("now")}
                            </span>
                          ) : undefined
                        }
                        after={
                          isCurrent && progress ? (
                            <span className="cd-stand-card__progress">{t("barOf", progress)}</span>
                          ) : undefined
                        }
                      />
                    </li>
                  );
                })}
              </ol>
              {/* Room after the last section, so the last ones can reach the top. */}
              <div className="cd-stand-stack__end" aria-hidden="true" />
            </main>
            <VisuallyHidden as="div" aria-live="polite">
              {now ? t("nowLive", { name: now.name }) : ""}
            </VisuallyHidden>

            {/* Previous, what comes next and Next at the bottom, where the thumb is, on an iPad or
              a desktop (T-2705); a phone keeps them in its one top bar. */}
            {!isPhone && (
              <nav aria-label={t("turnPage")}>
                <HStack gap={3} vAlign="center">
                  {previous ? (
                    <Button
                      label={previous.label}
                      size="lg"
                      href={previous.href}
                      icon={<Icon icon={ChevronLeftIcon} />}
                    />
                  ) : (
                    <span />
                  )}
                  <StackItem size="fill">
                    <VStack gap={0} hAlign="center">
                      <Text maxLines={1}>
                        {next ? (
                          <>
                            {t("nextUp")}{" "}
                            <b>{again ? t("again", { name: next.name }) : next.name}</b>
                          </>
                        ) : (
                          t("end")
                        )}
                      </Text>
                      <Text type="supporting" maxLines={1}>
                        {isPlaying ? t("hintPlaying") : t("hintIdle")}
                      </Text>
                    </VStack>
                  </StackItem>
                  {following ? (
                    <Button
                      label={following.label}
                      size="lg"
                      href={following.href}
                      variant="primary"
                      endContent={<Icon icon={ChevronRightIcon} />}
                    />
                  ) : (
                    <span />
                  )}
                </HStack>
              </nav>
            )}
            {/* An open player sits over the bottom: Previous and Next stay above it (T-2505). */}
            <DockRoom />
          </VStack>
          {tempoDialog}
          {
            <BottomSheet
              isOpen={isSheetOpen}
              onOpenChange={setSheetOpen}
              label={t("viewOptions")}
              height="hug"
            >
              <VStack gap={4} padding={4}>
                <VStack gap={2}>
                  <Heading level={2}>{title}</Heading>
                  {set && <Text type="supporting">{set.name}</Text>}
                  <HStack gap={2} wrap="wrap">
                    {songTokens}
                  </HStack>
                </VStack>
                {isPhone && viewAsControl}
                {tools}
                {isPhone && soundControls}
              </VStack>
            </BottomSheet>
          }
        </div>
      </Theme>
    </div>
  );
}
