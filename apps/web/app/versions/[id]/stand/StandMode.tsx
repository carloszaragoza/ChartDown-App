"use client";

import { Theme } from "@astryxdesign/core";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { chartdownStandTheme } from "../../../../theme/chartdown-stand";
import { chordFormatter, keyName, parse, sectionLength, type Key } from "chartdown";
import {
  BarRow,
  formStripItems,
  hasPickup,
  type FormStripItem,
  type MDNoteData,
} from "@chartdown/ui";
import {
  AdjustmentsHorizontalIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMetronome } from "../../../../lib/metronome/useMetronome";
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
  type TouchEvent,
} from "react";
import { ChartSection } from "../../../_components/ChartPreview";
import { SongForm } from "../../../_components/SongForm";
import { BeatsControl } from "../../../_components/BeatsControl";
import { useChartLabels } from "../../../_components/chartLabels";
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
const FORWARD = new Set(["ArrowRight", "ArrowDown", "PageDown", " "]);
const BACK = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

/**
 * Stand mode (R-03.3): the current section in chord-xl, the next in chord-sm, and one tap to
 * move on. Every control is a plain link, so it works without JavaScript; with it, moving is
 * instant and the address follows. Another song, or another View as, starts afresh: the router
 * keeps the page, so its state would carry over.
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
  // The visual metronome (R-11.1 to R-11.5): it plays from the section being read, and the
  // section follows it.
  const metronome = useMetronome(chart);
  const [isTempoOpen, setTempoOpen] = useState(false);
  const [askedTempo, setAskedTempo] = useState(100);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [current, setCurrent] = useState(() => readSection(chart, String(initial + 1)));
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
  const playingSection = metronome.position?.bar?.section;
  const [followed, setFollowed] = useState(playingSection);
  if (playingSection !== followed) {
    setFollowed(playingSection);
    if (playingSection !== undefined) setCurrent(playingSection);
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

  // On, and back: at a song's edge, the pedal and a swipe go on to the set's next song.
  const forward = useCallback(() => {
    if (atEdge.current.last && nextSong) router.push(nextSong);
    else move((now) => now + 1);
  }, [move, nextSong, router]);
  const backward = useCallback(() => {
    if (atEdge.current.first && previousSong) router.push(previousSong);
    else move((now) => now - 1);
  }, [move, previousSong, router]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea"))
        return;
      if (FORWARD.has(event.key)) {
        event.preventDefault();
        forward();
      } else if (BACK.has(event.key)) {
        event.preventDefault();
        backward();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forward, backward]);

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
    if (section >= 0) move(() => section);
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
  const next = chart.sections[current + 1];
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
  const viewAsControl = viewAs && (
    <SegmentedControl
      label={t("viewAs")}
      value={(chosenView ?? viewAs.options.find((option) => option.current))?.label ?? ""}
      onChange={chooseView}
    >
      {viewAs.options.map((option) => (
        <SegmentedControlItem key={option.href} value={option.label} label={option.label} />
      ))}
    </SegmentedControl>
  );
  const tools = (
    <nav aria-label={t("tools")}>
      <HStack gap={2} wrap="wrap">
        <Button
          label={style === "letters" ? v("numbers") : v("letters")}
          href={styleHref}
          as={Link}
          variant="secondary"
        />
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
          }}
        />
        <Button
          label={theme === "stage" ? t("light") : t("stage")}
          href={themeHref}
          as={Link}
          variant="secondary"
        />
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
      </HStack>
    </nav>
  );
  const songForm = (
    <SongForm
      label={c("songForm")}
      size="lg"
      current={current}
      notesLabel={labels.notesForYou}
      isStrip={isPhone}
      items={items.map((item) => ({
        abbreviation: item.abbreviation,
        description: describe(item),
        href: item.href,
        hasNotes: item.hasNotes,
      }))}
    />
  );

  const playFrom = (tempo?: number) =>
    metronome.play(metronome.firstBarOf(current), tempo !== undefined ? { tempo } : {});
  const playButton = (
    <Button
      label={metronome.isPlaying ? t("stop") : t("play")}
      size="lg"
      variant={metronome.isPlaying ? "primary" : "secondary"}
      isIconOnly
      icon={<Icon icon={metronome.isPlaying ? StopIcon : PlayIcon} />}
      onClick={() => {
        if (metronome.isPlaying) metronome.stop();
        else if (metronome.needsTempo) setTempoOpen(true);
        else playFrom();
      }}
    />
  );
  // "2 / 4", the beat and the beats of the bar, so the pulse never rests on color (R-11.3).
  const click = metronome.position?.click;
  const counter = click ? t("beatOf", { beat: click.count, of: click.of }) : null;
  const playing = metronome.position?.bar;
  const nowPlaying =
    playing && playing.section === current && click
      ? {
          row: playing.row,
          index: playing.index,
          downbeat: click.count === 1,
          item: playing.beats[click.beat]?.item ?? -1,
        }
      : undefined;

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
  const following =
    current < last
      ? { label: t("next"), href: href(current + 1) }
      : nextSong
        ? { label: t("nextSong"), href: nextSong }
        : undefined;

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
                {/* Back to the set or the version, where we are, View as in a set, and Previous
                  and Next (Design Handoff 2.0 screen 03). */}
                <nav aria-label={set ? t("setBar") : t("turn")}>
                  <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                    <HStack gap={2} vAlign="center">
                      <Button
                        label={back.label}
                        href={back.href}
                        as={Link}
                        variant="ghost"
                        icon={<Icon icon={ArrowUturnLeftIcon} />}
                      />
                      <VStack gap={0}>
                        {set && <Text weight="semibold">{set.name}</Text>}
                        <Text type="supporting">{set ? set.songOf : position}</Text>
                      </VStack>
                    </HStack>
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      {counter && (
                        <Text type="large" weight="bold">
                          {counter}
                        </Text>
                      )}
                      {playButton}
                      {viewAsControl}
                      {previous && (
                        <Button
                          label={previous.label}
                          size="lg"
                          href={previous.href}
                          icon={<Icon icon={ChevronLeftIcon} />}
                        />
                      )}
                      {following && (
                        <Button
                          label={following.label}
                          size="lg"
                          href={following.href}
                          variant="primary"
                          endContent={<Icon icon={ChevronRightIcon} />}
                        />
                      )}
                    </HStack>
                  </HStack>
                </nav>

                <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Heading level={1}>{title}</Heading>
                    {songTokens}
                  </HStack>
                  {tools}
                </HStack>
              </>
            )}

            {!isSideways && songForm}

            {/* The current section sits right under the song form, with the next one right after
              it; when it is taller than the screen it scrolls inside its own area (F-001). */}
            <main
              aria-live="polite"
              style={{ flex: "0 1 auto", minHeight: 0, overflowY: "auto" }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {now && (
                <ChartSection
                  key={current}
                  section={now}
                  formatter={formatter}
                  labels={labels}
                  notes={notes ? (notes[current] ?? []) : now.notes}
                  id="current-section"
                  isFramed
                  meter={chart.meter}
                  beats={beats}
                  size="lg"
                  {...(nowPlaying ? { now: nowPlaying } : {})}
                />
              )}
            </main>

            <VStack gap={2}>
              {next ? (
                <>
                  <Text type="supporting">
                    {labels.next}: <b>{next.name}</b> ·{" "}
                    {labels.length(sectionLength(next), { pickup: hasPickup(next) })}
                    {forYou[current + 1] && ` · ${labels.notesForYou}`}
                  </Text>
                  {!isPhone && next.rows[0] && (
                    <BarRow
                      row={next.rows[0]}
                      formatter={formatter}
                      labels={labels.bar}
                      meter={chart.meter}
                      beats={beats}
                      size="sm"
                    />
                  )}
                </>
              ) : (
                <Text type="supporting">{t("end")}</Text>
              )}
            </VStack>
          </VStack>
          {/* A chart with no tempo asks for one before it plays (R-11.1). */}
          <Dialog isOpen={isTempoOpen} onOpenChange={setTempoOpen} padding={4}>
            <VStack gap={4}>
              <Heading level={2}>{t("tempoTitle")}</Heading>
              <Text>{t("tempoAsk")}</Text>
              <NumberInput
                label={t("tempoLabel")}
                value={askedTempo}
                onChange={(value) => setAskedTempo(Math.min(300, Math.max(20, value)))}
              />
              <HStack gap={2} hAlign="end">
                <Button
                  label={t("play")}
                  variant="primary"
                  icon={<Icon icon={PlayIcon} />}
                  onClick={() => {
                    setTempoOpen(false);
                    playFrom(askedTempo);
                  }}
                />
              </HStack>
            </VStack>
          </Dialog>
          {isPhone && (
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
                {viewAsControl}
                {tools}
              </VStack>
            </BottomSheet>
          )}
        </div>
      </Theme>
    </div>
  );
}
