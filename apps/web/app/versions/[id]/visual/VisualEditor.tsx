"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Grid, GridSpan } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { chordFormatter, EVERYONE, parse, STANDARD_INSTRUMENTS, type Warning } from "chartdown";
import { BarRow, MDNotes, type BarLine } from "@chartdown/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { saveChart, type SaveState, type SourceValues } from "../edit/actions";
import { saveVideoPoints } from "../actions";
import { BandAudio, openAddAudio, type BandRecording } from "../BandAudio";
import { VideoLink } from "../../../_components/VideoDock";
import { useChartLabels } from "../../../_components/chartLabels";
import { usePlayingSection } from "../../../_components/usePlaybackBar";
import { videoId } from "../../../../lib/video/youtube";
import { SOURCE_TYPES } from "../../../../lib/versions/validate";
import {
  addNote,
  addRow,
  addSection,
  appendBar,
  breakRowAfter,
  deleteBar,
  deleteNote,
  deleteSection,
  duplicateSection,
  insertBar,
  hasIndication,
  hasMark,
  markChord,
  moveSection,
  renameSection,
  repeatSection,
  repeatsOf,
  setBar,
  setTimes,
  step,
  toggleIndication,
  type BarAt,
  type ChordMark,
} from "../../../../lib/visual/edit";
import {
  canonicalText,
  chartText,
  isKnownToken,
  lyricWords,
  MAX_LYRIC_WORDS,
  meters,
  needsAttention,
  nextName,
  rowGroups,
  splitNeed,
  suggestSection,
  tokens,
  visualChart,
  type VisualBar,
  type VisualChart,
  type VisualNote,
} from "../../../../lib/visual/model";
import { speakChords, type ChordWords } from "../../../../lib/visual/speak";
import { VISUAL_ICONS, type VisualAction } from "../../../../lib/visual/icons";

/** An action's icon from the editor's one list (R-13.16). */
const icon = (action: VisualAction) => <Icon icon={VISUAL_ICONS[action]} />;

/** How a tool is typed in a bar, said in its tooltip: tools and typing write the same (R-13.7). */
const TYPED: Partial<Record<VisualAction, string>> = {
  push: "'5",
  shortPush: "''5",
  stab: "5!",
  fermata: "5~",
  hold: "<5>",
  repeatBar: "%",
  rest: "x",
};

export interface VisualEditorProps {
  versionId: string;
  title: string;
  artists: string[];
  /** The arranger: the version's author. */
  author: string;
  revisionId: string;
  /** The current revision's text. */
  content: string;
  source: SourceValues;
  videoStart: number | null;
  videoEnd: number | null;
  recordings: BandRecording[];
  /** The bands whose recording this person may add (R-06.7). */
  bands: { id: string; name: string }[];
}

type Line = BarLine;
const LINES: Line[] = ["tags", "chords", "lyric"];
const FIELD: Record<Line, "top" | "chords" | "lyric"> = {
  tags: "top",
  chords: "chords",
  lyric: "lyric",
};
// Characters that would end a bar or open a mark in the text; a line never holds them.
const UNSAFE: Record<Line, RegExp> = {
  tags: /[{}|"]/g,
  chords: /[{}|"]/g,
  lyric: /[{}|"]/g,
};

const METERS = ["4/4", "3/4", "6/8", "12/8", "2/4", "2/2", "5/4", "7/8", "9/8"];
// What a tempo counts (R-00.18), and its name in the messages.
const UNITS = [
  ["", "none"],
  ["q", "q"],
  ["h", "h"],
  ["q.", "qDot"],
  ["e", "e"],
  ["h.", "hDot"],
  ["e.", "eDot"],
] as const;
// Qualities read in words (R-13.13); others are spelled out.
const QUALITY_WORDS = {
  m: "minor",
  "7": "seven",
  maj7: "majorSeven",
  m7: "minorSeven",
  sus: "sus",
  sus2: "sus2",
  dim: "dim",
  dim7: "dim7",
  aug: "aug",
  "6": "six",
  "9": "nine",
  add9: "add9",
  m7b5: "halfDim",
  "5": "power",
} as const;
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"].flatMap((key) => [
  key,
  `${key}m`,
]);
const DYNAMICS = ["pp", "p", "mp", "mf", "f", "ff", "cresc.", "decresc."] as const;
const NAVIGATION = ["Segno", "Coda", "To Coda", "D.S. al Coda", "D.C. al Fine", "Fine"] as const;
const CHORD_MARKS: ChordMark[] = ["push", "shortPush", "stab", "fermata", "hold"];

interface History {
  past: VisualChart[];
  present: VisualChart;
  future: VisualChart[];
}

/** What a tool does to a bar, or to one of its chords (R-13.7). */
type Tool =
  | { kind: "mark"; mark: ChordMark }
  | { kind: "indication"; text: string }
  | { kind: "repeatStart" }
  | { kind: "repeatEnd" }
  | { kind: "ending"; number: number }
  | { kind: "pickup" }
  | { kind: "rest" }
  | { kind: "repeatBar" };

/**
 * The visual editor (SPEC-13): the chart written on itself, as it will be read. Each bar has three
 * lines (indications, chords, lyric) written in place, Tab and Enter moving on; tools are dragged
 * onto a bar or a chord for what isn't typed; sections are added by name and carry the MD's
 * indications; the song's video and the band's audio play as in the Chart editor. It saves the
 * chart's canonical ChartDown text as a revision, like the Chart editor, which it leaves as it is.
 */
export function VisualEditor({
  versionId,
  title,
  artists,
  author,
  revisionId,
  content,
  source,
  videoStart,
  videoEnd,
  recordings,
  bands,
}: VisualEditorProps) {
  const t = useTranslations("visual");
  const sources = useTranslations("version.source");
  const instruments = useTranslations("instruments");
  const labels = useChartLabels();
  const language = useLocale() === "es" ? "es" : "en";
  /** A section after another one, named as the song most often goes on (R-13.9). */
  const addAfter = (after: number) => {
    change((c) => addSection(c, after, suggestSection(c.sections, after, language)));
    setSelected({ section: after + 1, bar: 0 });
  };
  const router = useRouter();
  const opening = useMemo(() => parse(content), [content]);
  const warnings = opening.warnings;
  const initial = useMemo(() => visualChart(content), [content]);
  // A chart already in its canonical form needs no notice before the first change (R-13.1).
  const isCanonical = useMemo(
    () => warnings.length === 0 && canonicalText(initial, title) === content,
    [initial, title, content, warnings.length],
  );
  const [accepted, setAccepted] = useState(isCanonical);
  const [asking, setAsking] = useState<(() => void) | null>(null);
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const chart = history.present;
  const [selected, setSelected] = useState<BarAt | null>(null);
  const [editing, setEditing] = useState<{ at: BarAt; line: Line } | null>(null);
  const [details, setDetails] = useState(false);
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [youtube, setYoutube] = useState(source.youtube);
  const [sourceType, setSourceType] = useState(source.sourceType);
  const [album, setAlbum] = useState(source.album);
  const [year, setYear] = useState(source.year);
  const [state, action, saving] = useActionState<SaveState, FormData>(saveChart, {
    status: "idle",
    baseRevisionId: revisionId,
    savedContent: content,
    savedSource: source,
  });
  const saved = canonicalText(chart, title);
  const sourceNow: SourceValues = { sourceType, album, year, youtube };
  const dirty =
    (accepted && saved !== state.savedContent && history.past.length > 0) ||
    JSON.stringify(sourceNow) !== JSON.stringify(state.savedSource);

  // What is drawn: the chart with its empty bars kept in place (R-13.3).
  const drawn = useMemo(() => parse(chartText(chart, "rest")), [chart]);
  const formatter = useMemo(() => chordFormatter(drawn, { style: "numbers" }), [drawn]);
  const meterAt = useMemo(() => meters(chart), [chart]);
  const playing = usePlayingSection(drawn);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Every change goes through here: the notice first, then a step undo can take back (R-13.11). */
  const change = (next: (chart: VisualChart) => VisualChart) => {
    const run = () =>
      setHistory((h) => ({
        past: [...h.past, h.present].slice(-200),
        present: next(h.present),
        future: [],
      }));
    if (accepted) run();
    else setAsking(() => run);
  };
  /** Typing in a line updates the chart as it goes, in the step its editing began. */
  const typeIn = (at: BarAt, line: Line, value: string) =>
    setHistory((h) => ({
      ...h,
      present: setBar(h.present, at, { [FIELD[line]]: value.replace(UNSAFE[line], "") }),
    }));
  const undo = () =>
    setHistory((h) =>
      h.past.length === 0
        ? h
        : {
            past: h.past.slice(0, -1),
            present: h.past[h.past.length - 1] as VisualChart,
            future: [h.present, ...h.future],
          },
    );
  const redo = () =>
    setHistory((h) =>
      h.future.length === 0
        ? h
        : {
            past: [...h.past, h.present],
            present: h.future[0] as VisualChart,
            future: h.future.slice(1),
          },
    );

  const barAt = (at: BarAt | null) => (at ? chart.sections[at.section]?.bars[at.bar] : undefined);
  const begin = (at: BarAt, line: Line) => {
    const go = () => {
      setHistory((h) => ({
        past: [...h.past, h.present].slice(-200),
        present: h.present,
        future: [],
      }));
      setSelected(at);
      setEditing({ at, line });
    };
    if (accepted) go();
    else setAsking(() => go);
  };
  const finish = () => {
    // A step that changed nothing leaves no undo behind.
    setHistory((h) =>
      h.past.length > 0 && JSON.stringify(h.past[h.past.length - 1]) === JSON.stringify(h.present)
        ? { ...h, past: h.past.slice(0, -1) }
        : h,
    );
    setEditing(null);
  };
  const moveTo = (at: BarAt, by: 1 | -1, line: Line) => {
    finish();
    let next = step(chart, at, by);
    const lastInSection = at.bar === (chart.sections[at.section]?.bars.length ?? 0) - 1;
    if (by === 1 && lastInSection && (!next || next.section !== at.section)) {
      // Past a section's last bar, Tab writes a new one, on a new row after four (R-13.5, R-13.10).
      setHistory((h) => ({ ...h, present: appendBar(h.present, at.section) }));
      next = { section: at.section, bar: at.bar + 1 };
    }
    if (next) begin(next, line);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>, at: BarAt, line: Line) => {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      moveTo(at, event.shiftKey ? -1 : 1, line);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const index = LINES.indexOf(line) + (event.key === "ArrowUp" ? -1 : 1);
      const to = LINES[Math.min(Math.max(index, 0), LINES.length - 1)] as Line;
      setEditing({ at, line: to });
    } else if (event.altKey && /^Digit[1-6]$/.test(event.code)) {
      // ⌥1 to ⌥3 choose the split of a bar that asks for one (R-13.6).
      const bar = barAt(at);
      const need = bar ? splitNeed(bar, meterAt[at.section]?.[at.bar] ?? "4/4") : null;
      const option =
        need?.kind === "choose" ? need.options[Number(event.code.slice(5)) - 1] : undefined;
      if (option) {
        event.preventDefault();
        typeSplit(at, option);
      }
    }
  };
  const typeSplit = (at: BarAt, split: number[]) =>
    setHistory((h) => ({ ...h, present: setBar(h.present, at, { split }) }));

  /** A tool used on a bar, or on one of its chords (R-13.7). */
  const apply = (tool: Tool, at: BarAt, chord?: number) => {
    const bar = barAt(at);
    if (!bar) return;
    const changes: Partial<VisualBar> = (() => {
      switch (tool.kind) {
        case "mark":
          return { chords: markChord(bar, tool.mark, chord) };
        case "indication":
          return { top: toggleIndication(bar.top, tool.text) };
        case "repeatStart":
          return { repeatStart: !bar.repeatStart };
        case "repeatEnd":
          return { repeatEnd: bar.repeatEnd ? null : 2 };
        case "ending":
          return { ending: bar.ending?.[0] === tool.number ? null : [tool.number] };
        case "pickup":
          return { pickup: bar.pickup === null ? 1 : null, meter: null };
        case "rest":
          return { chords: "x", split: null };
        case "repeatBar":
          return { chords: "%", split: null };
      }
    })();
    change((c) => setBar(c, at, changes));
    setSelected(at);
  };

  const chordWords: ChordWords = {
    degree: (degree) => {
      const number = degree.replace(/^[b#]/, "");
      return [
        degree.startsWith("b") ? t("say.flat") : degree.startsWith("#") ? t("say.sharp") : "",
        /^[1-7]$/.test(number) ? t(`say.number.${number as "1"}`) : number,
      ]
        .filter(Boolean)
        .join(" ");
    },
    quality: (quality) =>
      quality in QUALITY_WORDS
        ? t(`say.quality.${QUALITY_WORDS[quality as keyof typeof QUALITY_WORDS]}`)
        : undefined,
    over: (bass) => t("say.over", { bass }),
    push: t("say.push"),
    rest: t("say.rest"),
    repeat: t("say.repeat"),
  };

  /** What a line shows when the editor draws it itself: the field being typed in, or red chords. */
  const ownLine = (at: BarAt, bar: VisualBar, line: Line): ReactNode | undefined => {
    if (
      editing &&
      editing.at.section === at.section &&
      editing.at.bar === at.bar &&
      editing.line === line
    ) {
      const value = bar[FIELD[line]];
      return (
        <input
          className="cd-chart__input"
          // The field takes the focus as it opens, so typing writes in the bar at once.
          autoFocus
          value={value}
          aria-label={t(`line.${line}`)}
          placeholder={t(`placeholder.${line}`)}
          list={line === "tags" ? "cd-visual-indications" : undefined}
          onChange={(event) => typeIn(at, line, event.target.value)}
          onKeyDown={(event) => onKey(event, at, line)}
          onBlur={() => finish()}
        />
      );
    }
    if (line === "chords") {
      const list = tokens(bar.chords);
      if (list.length === 0) return "";
      if (list.some((token) => !isKnownToken(token))) {
        return (
          <span>
            {list.map((token, index) => (
              <span
                key={index}
                className={isKnownToken(token) ? "cd-chart__chord" : "cd-chart__unknown"}
              >
                {token}{" "}
              </span>
            ))}
          </span>
        );
      }
    }
    return undefined;
  };

  // A tap or a click chooses a bar and the line under it (R-13.3, R-13.5).
  const pick = (event: MouseEvent<HTMLDivElement>, section: number, group: number[]) => {
    const target = event.target as HTMLElement;
    if (target.closest("input")) return;
    const element = target.closest<HTMLElement>("[data-index]");
    if (!element) return;
    const bar = group[Number(element.dataset.index)];
    if (bar === undefined) return;
    const line = (target.closest<HTMLElement>("[data-line]")?.dataset.line ?? "chords") as Line;
    begin({ section, bar }, line);
  };

  const [dropOn, setDropOn] = useState<string | null>(null);
  const dropTarget = (event: DragEvent<HTMLDivElement>, section: number, group: number[]) => {
    const element = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!element) return null;
    const bar = group[Number(element.dataset.index)];
    if (bar === undefined) return null;
    const chords = Array.from(element.querySelectorAll(".cd-chart__chord, .cd-chart__unknown"));
    const chord = chords.findIndex((node) => node.contains(event.target as Node));
    return {
      at: { section, bar },
      chord: chord >= 0 ? chord : undefined,
      key: `${section}:${bar}`,
    };
  };
  const onDrop = (event: DragEvent<HTMLDivElement>, section: number, group: number[]) => {
    event.preventDefault();
    setDropOn(null);
    const found = dropTarget(event, section, group);
    const raw = event.dataTransfer.getData("application/x-chartdown-tool");
    if (!found || !raw) return;
    apply(JSON.parse(raw) as Tool, found.at, found.chord);
  };

  const label = (at: BarAt, bar: VisualBar) =>
    [
      t("say.bar", { section: chart.sections[at.section]?.name ?? "", number: at.bar + 1 }),
      bar.chords ? speakChords(bar.chords, chordWords) : t("say.empty"),
      t("say.beats", {
        count: bar.pickup ?? Number((meterAt[at.section]?.[at.bar] ?? "4/4").split("/")[0]),
      }),
    ].join(", ");

  const selectedBar = barAt(selected);
  const selectedNeed =
    selected && selectedBar
      ? splitNeed(selectedBar, meterAt[selected.section]?.[selected.bar] ?? "4/4")
      : null;

  // Whether a tool is already on the selected bar, or on its last chord, so it shows pressed.
  const isOn = (tool: Tool): boolean => {
    const bar = selectedBar;
    if (!bar) return false;
    switch (tool.kind) {
      case "mark":
        return hasMark(tokens(bar.chords).at(-1) ?? "", tool.mark);
      case "indication":
        return hasIndication(bar.top, tool.text);
      case "repeatStart":
        return bar.repeatStart;
      case "repeatEnd":
        return bar.repeatEnd !== null;
      case "ending":
        return bar.ending?.[0] === tool.number;
      case "pickup":
        return bar.pickup !== null;
      case "rest":
        return bar.chords.trim() === "x";
      case "repeatBar":
        return bar.chords.trim() === "%";
    }
  };

  const toolButton = (tool: Tool, text: string, key: VisualAction) => (
    <div
      key={key}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-chartdown-tool", JSON.stringify(tool));
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <ToggleButton
        label={text}
        size="lg"
        icon={icon(key)}
        isPressed={isOn(tool)}
        tooltip={selected ? (TYPED[key] ?? text) : t("tools.choose")}
        isDisabled={!selected}
        onPressedChange={() => selected && apply(tool, selected)}
      >
        {text}
      </ToggleButton>
    </div>
  );

  // A group of tools says what it applies to; the group of the line being written is
  // highlighted (R-13.7).
  const toolGroup = (name: string, hint: string, active: boolean, tools: ReactNode) => (
    <Card variant={active ? "blue" : "muted"} padding={2}>
      <VStack gap={1.5}>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="label" weight="semibold">
            {name}
          </Text>
          <Text type="supporting">{selected ? hint : t("tools.group.choose")}</Text>
        </HStack>
        <HStack gap={1} wrap="wrap" role="group" aria-label={name}>
          {tools}
        </HStack>
      </VStack>
    </Card>
  );

  const headerTokens = [
    chart.meta.key && t("header.key", { key: chart.meta.key }),
    chart.meta.meter ?? "4/4",
    chart.meta.tempo && t("header.tempo", { tempo: chart.meta.tempo }),
    chart.meta.feel,
  ].filter(Boolean) as string[];

  if (warnings.length > 0) {
    // A chart written by hand with warnings is fixed in Text first (R-13.8).
    return (
      <Layout height="auto" padding={8} contentWidth={760}>
        <VStack gap={4}>
          <Heading level={1}>{title}</Heading>
          <Banner status="warning" title={t("warningsTitle")} description={t("warningsHint")} />
          <VStack gap={2}>
            {warnings.map((warning: Warning, index) => (
              <Text key={index}>
                <b>{t("lineNumber", { line: warning.line })}</b> {warning.message}
              </Text>
            ))}
          </VStack>
          <HStack>
            <Button label={t("fixInText")} variant="primary" href={`/versions/${versionId}/edit`} />
          </HStack>
        </VStack>
      </Layout>
    );
  }

  return (
    <Layout
      padding={8}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
            {/* The chart's header, as a printed chart's first lines (R-13.2). */}
            <VStack gap={1}>
              <Text type="supporting">{t("overline")}</Text>
              <Heading level={1}>{title}</Heading>
              <Text color="secondary">
                {[artists.join(", "), author && t("arranger", { name: author })]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <HStack gap={1} wrap="wrap">
                {headerTokens.map((token) => (
                  <Token key={token} label={token} size="sm" />
                ))}
              </HStack>
            </VStack>
            <form action={action}>
              <input type="hidden" name="versionId" value={versionId} />
              <input type="hidden" name="content" value={accepted ? saved : content} />
              <input type="hidden" name="sourceType" value={sourceType} />
              <input type="hidden" name="album" value={album} />
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="youtube" value={youtube} />
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Button
                  label={t("undo")}
                  isIconOnly
                  tooltip={t("undo")}
                  icon={icon("undo")}
                  isDisabled={history.past.length === 0}
                  onClick={undo}
                />
                <Button
                  label={t("redo")}
                  isIconOnly
                  tooltip={t("redo")}
                  icon={icon("redo")}
                  isDisabled={history.future.length === 0}
                  onClick={redo}
                />
                <Button
                  label={t("details")}
                  icon={icon("details")}
                  onClick={() => setDetails(true)}
                />
                {videoId(youtube) && (
                  <VideoLink
                    url={youtube}
                    chart={drawn}
                    saved={videoStart}
                    savedEnd={videoEnd}
                    save={(points) => saveVideoPoints(versionId, points)}
                  />
                )}
                {bands.length > 0 && (
                  <Button label={t("addAudio")} icon={icon("addAudio")} onClick={openAddAudio} />
                )}
                <Button
                  label={t("openText")}
                  icon={icon("openText")}
                  variant="ghost"
                  href={`/versions/${versionId}/edit`}
                />
                <Button
                  label={t("done")}
                  icon={icon("done")}
                  variant="ghost"
                  href={`/versions/${versionId}`}
                />
                <Button
                  type="submit"
                  variant="primary"
                  label={t("save")}
                  icon={icon("save")}
                  isLoading={saving}
                  isDisabled={!dirty}
                />
              </HStack>
            </form>
          </HStack>
          {state.status === "saved" && (
            <Text type="supporting" role="status">
              {t("savedAs", { number: state.number ?? 0 })}
            </Text>
          )}
          {(state.status === "changed" ||
            state.status === "error" ||
            state.status === "invalid") && (
            <div role="alert">
              <Banner status="error" title={t(`errors.${state.status}`)} />
            </div>
          )}
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={8}>
            {(recordings.length > 0 || bands.length > 0) && (
              <BandAudio
                versionId={versionId}
                recordings={recordings}
                bands={bands}
                chart={drawn}
              />
            )}
            {/* The chart's page: its sections, one after another, and Add a section (R-13.3). */}
            <Card padding={4}>
              <VStack gap={6}>
                {chart.sections.map((section, s) => {
                  const parsed = drawn.sections[s];
                  const isPlaying = playing === s;
                  const head = (
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      {renaming === s ? (
                        <TextInput
                          label={t("sectionName")}
                          isLabelHidden
                          value={section.name}
                          onChange={(name) =>
                            setHistory((h) => ({
                              ...h,
                              present: renameSection(h.present, s, name),
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === "Escape") setRenaming(null);
                          }}
                          onBlur={() => setRenaming(null)}
                          hasAutoFocus
                        />
                      ) : (
                        <Heading level={2}>{section.name}</Heading>
                      )}
                      {section.use ? (
                        <>
                          <Token
                            label={t("repeatToken", { times: section.times ?? 1 })}
                            icon={icon("repeatSection")}
                            size="sm"
                            color="blue"
                          />
                          <Text type="supporting">{t("repeatsAbove", { name: section.use })}</Text>
                        </>
                      ) : (
                        <Text type="supporting">
                          {t("barCount", { count: section.bars.length })}
                        </Text>
                      )}
                      {isPlaying && <Token label={t("playing")} size="sm" color="blue" />}
                      {section.use && (
                        // A repeat is read-only, with Edit original in its menu (R-13.9).
                        <HStack gap={1} vAlign="center">
                          <Button
                            label="−"
                            size="sm"
                            tooltip={t("repeatTimes")}
                            isDisabled={(section.times ?? 1) <= 1}
                            onClick={() =>
                              change((c) => setTimes(c, s, Math.max(1, (section.times ?? 1) - 1)))
                            }
                          />
                          <Button
                            label="+"
                            size="sm"
                            tooltip={t("repeatTimes")}
                            onClick={() => change((c) => setTimes(c, s, (section.times ?? 1) + 1))}
                          />
                        </HStack>
                      )}
                      <MoreMenu
                        label={t("sectionMenu", { name: section.name })}
                        presentation="adaptive"
                        items={[
                          ...(section.use
                            ? [
                                {
                                  label: t("editOriginal"),
                                  icon: icon("editOriginal"),
                                  onClick: () => {
                                    const original = chart.sections.findIndex(
                                      (x) => x.name === section.use && !x.use,
                                    );
                                    if (original >= 0) setSelected({ section: original, bar: 0 });
                                    document
                                      .getElementById(`cd-visual-${original}`)
                                      ?.scrollIntoView({ behavior: "smooth" });
                                  },
                                },
                              ]
                            : [
                                {
                                  label: t("rename"),
                                  icon: icon("rename"),
                                  onClick: () => {
                                    change((c) => c);
                                    setRenaming(s);
                                  },
                                },
                                {
                                  label: t("addSectionAfter"),
                                  icon: icon("addSection"),
                                  onClick: () => addAfter(s),
                                },
                                {
                                  label: t("addNote"),
                                  icon: icon("addNote"),
                                  onClick: () => setNoteFor(s),
                                },
                                {
                                  label: t("repeatSection"),
                                  icon: icon("repeatSection"),
                                  onClick: () => change((c) => repeatSection(c, s, 2)),
                                },
                                {
                                  label: t("duplicate"),
                                  icon: icon("duplicate"),
                                  onClick: () =>
                                    change((c) =>
                                      duplicateSection(
                                        c,
                                        s,
                                        nextName(c.sections, `${section.name} 2`),
                                      ),
                                    ),
                                },
                              ]),
                          {
                            label: t("moveUp"),
                            icon: icon("moveUp"),
                            onClick: () => change((c) => moveSection(c, s, -1)),
                          },
                          {
                            label: t("moveDown"),
                            icon: icon("moveDown"),
                            onClick: () => change((c) => moveSection(c, s, 1)),
                          },
                          { type: "divider" as const },
                          {
                            label: t("deleteSection"),
                            icon: icon("deleteSection"),
                            variant: "destructive" as const,
                            onClick: () =>
                              repeatsOf(chart, s) > 0
                                ? setConfirmDelete(s)
                                : change((c) => deleteSection(c, s)),
                          },
                        ]}
                      />
                    </HStack>
                  );
                  return (
                    <section key={s} id={`cd-visual-${s}`} aria-label={section.name}>
                      <Card
                        variant={section.use ? "muted" : "transparent"}
                        padding={section.use ? 2 : 0}
                      >
                        <VStack gap={3}>
                          {head}
                          {section.notes.length > 0 && (
                            <HStack gap={2} vAlign="start" wrap="wrap">
                              <MDNotes
                                notes={parsed?.notes ?? []}
                                instrumentName={labels.bar.instrument}
                              />
                              {section.notes.map((note, n) => (
                                <Button
                                  key={n}
                                  label={t("deleteNote", { text: note.text })}
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  icon={icon("deleteNote")}
                                  onClick={() => change((c) => deleteNote(c, s, n))}
                                />
                              ))}
                            </HStack>
                          )}
                          {!section.use &&
                            rowGroups(section).map((group, r) => {
                              const row = parsed?.rows[r];
                              if (!row) return null;
                              const at = (index: number): BarAt => ({
                                section: s,
                                bar: group[index] as number,
                              });
                              return (
                                <div
                                  key={r}
                                  onClick={(event) => pick(event, s, group)}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    const found = dropTarget(event, s, group);
                                    setDropOn(found?.key ?? null);
                                  }}
                                  onDragLeave={() => setDropOn(null)}
                                  onDrop={(event) => onDrop(event, s, group)}
                                >
                                  <BarRow
                                    row={row}
                                    formatter={formatter}
                                    labels={labels.bar}
                                    size="md"
                                    beats="auto"
                                    edit={{
                                      ...(selected?.section === s && group.includes(selected.bar)
                                        ? { selected: group.indexOf(selected.bar) }
                                        : {}),
                                      ...(editing?.at.section === s &&
                                      group.includes(editing.at.bar)
                                        ? { editing: group.indexOf(editing.at.bar) }
                                        : {}),
                                      flagged: group.flatMap((bar, index) =>
                                        needsAttention(
                                          section.bars[bar] as VisualBar,
                                          meterAt[s]?.[bar] ?? "4/4",
                                        ) || dropOn === `${s}:${bar}`
                                          ? [index]
                                          : [],
                                      ),
                                      line: (index, line) =>
                                        ownLine(
                                          at(index),
                                          section.bars[group[index] as number] as VisualBar,
                                          line,
                                        ),
                                      label: (index) =>
                                        label(
                                          at(index),
                                          section.bars[group[index] as number] as VisualBar,
                                        ),
                                    }}
                                  />
                                </div>
                              );
                            })}
                          {!section.use && (
                            <HStack>
                              <Button
                                label={t("addRow")}
                                variant="ghost"
                                icon={icon("addRow")}
                                onClick={() => change((c) => addRow(c, s))}
                              />
                            </HStack>
                          )}
                        </VStack>
                      </Card>
                    </section>
                  );
                })}
                <div className="cd-chart__add">
                  <Button
                    label={t("addSection")}
                    icon={icon("addSection")}
                    variant="ghost"
                    size="lg"
                    width="100%"
                    // After the section being written in, or at the end.
                    onClick={() => addAfter(selected?.section ?? chart.sections.length - 1)}
                  />
                </div>
              </VStack>
            </Card>
            <datalist id="cd-visual-indications">
              {[
                ...DYNAMICS,
                ...NAVIGATION,
                "Drums in",
                "Drums out",
                "Band in",
                "Band out",
                "rit.",
                "a tempo",
              ].map((word) => (
                <option key={word} value={word} />
              ))}
            </datalist>
          </VStack>
        </LayoutContent>
      }
      footer={
        // The tools, docked at the foot so they never cover the bar being written (R-13.7, R-13.12).
        <LayoutFooter hasDivider label={t("tools.label")}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text type="supporting">
                {selected
                  ? t("tools.selected", {
                      bar: label(selected, selectedBar as VisualBar),
                    })
                  : t("tools.hint")}
              </Text>
              {editing?.line === "lyric" && selectedBar && (
                <Text type="supporting" role="status">
                  {t("words", { count: lyricWords(selectedBar.lyric), max: MAX_LYRIC_WORDS })}
                </Text>
              )}
              {selected && selectedNeed?.kind === "choose" && (
                <HStack gap={1} vAlign="center" wrap="wrap">
                  <Text type="supporting">{t("split")}</Text>
                  {selectedNeed.options.map((option, index) => (
                    <Button
                      key={option.join("+")}
                      size="sm"
                      label={option.join("+")}
                      variant={
                        selectedBar?.split?.join("+") === option.join("+") ? "primary" : "secondary"
                      }
                      {...(index < 6 ? { tooltip: `⌥${index + 1}` } : {})}
                      onClick={() => change((c) => setBar(c, selected, { split: option }))}
                    />
                  ))}
                </HStack>
              )}
              {selected && selectedNeed?.kind === "over" && (
                <Text type="supporting">{t("over")}</Text>
              )}
              {selected && selectedBar?.repeatEnd && (
                <HStack gap={1} vAlign="center">
                  <Text type="supporting">{t("plays")}</Text>
                  <Button
                    size="sm"
                    label="−"
                    isDisabled={selectedBar.repeatEnd <= 2}
                    onClick={() =>
                      change((c) =>
                        setBar(c, selected, {
                          repeatEnd: Math.max(2, (selectedBar.repeatEnd ?? 2) - 1),
                        }),
                      )
                    }
                  />
                  <Text weight="semibold">×{selectedBar.repeatEnd}</Text>
                  <Button
                    size="sm"
                    label="+"
                    onClick={() =>
                      change((c) =>
                        setBar(c, selected, { repeatEnd: (selectedBar.repeatEnd ?? 2) + 1 }),
                      )
                    }
                  />
                </HStack>
              )}
              {selected && selectedBar?.pickup !== null && selectedBar?.pickup !== undefined && (
                <HStack gap={1} vAlign="center">
                  <Text type="supporting">{t("pickupBeats")}</Text>
                  <Button
                    size="sm"
                    label="−"
                    isDisabled={selectedBar.pickup <= 1}
                    onClick={() =>
                      change((c) =>
                        setBar(c, selected, { pickup: Math.max(1, (selectedBar.pickup ?? 1) - 1) }),
                      )
                    }
                  />
                  <Text weight="semibold">{selectedBar.pickup}</Text>
                  <Button
                    size="sm"
                    label="+"
                    onClick={() =>
                      change((c) => setBar(c, selected, { pickup: (selectedBar.pickup ?? 1) + 1 }))
                    }
                  />
                </HStack>
              )}
              {selected && (
                <MoreMenu
                  label={t("barMenu")}
                  presentation="adaptive"
                  items={[
                    {
                      label: t("insertBefore"),
                      icon: icon("insertBefore"),
                      onClick: () => change((c) => insertBar(c, selected, "before")),
                    },
                    {
                      label: t("insertAfter"),
                      icon: icon("insertAfter"),
                      onClick: () => change((c) => insertBar(c, selected, "after")),
                    },
                    {
                      label: t("newRow"),
                      icon: icon("newRow"),
                      onClick: () => change((c) => breakRowAfter(c, selected)),
                    },
                    { type: "divider" as const },
                    {
                      label: t("deleteBar"),
                      icon: icon("deleteBar"),
                      variant: "destructive" as const,
                      onClick: () => {
                        change((c) => deleteBar(c, selected));
                        setSelected(null);
                      },
                    },
                  ]}
                />
              )}
            </HStack>
            <Grid columns={{ minWidth: 420, max: 2 }} gap={2}>
              <GridSpan columns="full">
                {toolGroup(
                  t("tools.group.chord"),
                  t("tools.group.chordHint"),
                  editing?.line === "chords",
                  CHORD_MARKS.map((mark) =>
                    toolButton({ kind: "mark", mark }, t(`tools.${mark}`), mark),
                  ),
                )}
              </GridSpan>
              <GridSpan columns="full">
                {toolGroup(
                  t("tools.group.bar"),
                  t("tools.group.barHint"),
                  selected !== null && editing === null,
                  <>
                    {toolButton({ kind: "repeatStart" }, t("tools.repeatStart"), "repeatStart")}
                    {toolButton({ kind: "repeatEnd" }, t("tools.repeatEnd"), "repeatEnd")}
                    {toolButton(
                      { kind: "ending", number: 1 },
                      t("tools.ending", { number: 1 }),
                      "ending1",
                    )}
                    {toolButton(
                      { kind: "ending", number: 2 },
                      t("tools.ending", { number: 2 }),
                      "ending2",
                    )}
                    {toolButton({ kind: "pickup" }, t("tools.pickup"), "pickup")}
                    {toolButton({ kind: "rest" }, t("tools.rest"), "rest")}
                    {toolButton({ kind: "repeatBar" }, t("tools.repeatBar"), "repeatBar")}
                  </>,
                )}
              </GridSpan>
              {toolGroup(
                t("tools.group.roadMap"),
                t("tools.group.barHint"),
                false,
                NAVIGATION.map((word) =>
                  toolButton({ kind: "indication", text: word }, word, word),
                ),
              )}
              {toolGroup(
                t("tools.group.dynamics"),
                t("tools.group.dynamicsHint"),
                editing?.line === "tags",
                DYNAMICS.map((word) => toolButton({ kind: "indication", text: word }, word, word)),
              )}
            </Grid>
          </VStack>
        </LayoutFooter>
      }
    >
      <Dialog
        isOpen={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        purpose="required"
        padding={4}
      >
        {/* Before the first change to a chart written by hand (R-13.1). */}
        <VStack gap={4}>
          <Heading level={2}>{t("notice.title")}</Heading>
          <Text>{t("notice.body")}</Text>
          <HStack gap={2} hAlign="end">
            <Button
              label={t("notice.text")}
              variant="ghost"
              onClick={() => router.push(`/versions/${versionId}/edit`)}
            />
            <Button
              label={t("notice.continue")}
              variant="primary"
              onClick={() => {
                const run = asking;
                setAccepted(true);
                setAsking(null);
                run?.();
              }}
            />
          </HStack>
        </VStack>
      </Dialog>
      <Dialog
        isOpen={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        padding={4}
      >
        <VStack gap={4}>
          <Heading level={2}>
            {t("confirmDelete.title", { name: chart.sections[confirmDelete ?? 0]?.name ?? "" })}
          </Heading>
          <Text>
            {t("confirmDelete.body", {
              count: confirmDelete === null ? 0 : repeatsOf(chart, confirmDelete),
            })}
          </Text>
          <HStack gap={2} hAlign="end">
            <Button label={t("cancel")} variant="ghost" onClick={() => setConfirmDelete(null)} />
            <Button
              label={t("deleteSection")}
              variant="destructive"
              onClick={() => {
                const index = confirmDelete;
                setConfirmDelete(null);
                if (index !== null) change((c) => deleteSection(c, index));
              }}
            />
          </HStack>
        </VStack>
      </Dialog>
      <NoteDialog
        open={noteFor !== null}
        section={chart.sections[noteFor ?? 0]?.name ?? ""}
        instruments={STANDARD_INSTRUMENTS.map((instrument) => ({
          value: instrument.id,
          label: instruments.has(instrument.id as "keys")
            ? instruments(instrument.id as "keys")
            : instrument.id,
        }))}
        onClose={() => setNoteFor(null)}
        onAdd={(note) => {
          const index = noteFor;
          setNoteFor(null);
          if (index !== null) change((c) => addNote(c, index, note));
        }}
      />
      <Dialog isOpen={details} onOpenChange={setDetails} padding={4} width={560} purpose="form">
        {/* The song's details: the header's fields and the version's source (R-13.2, R-13.11). */}
        <VStack gap={4}>
          <Heading level={2}>{t("details")}</Heading>
          <HStack gap={3} wrap="wrap">
            <Selector
              label={t("field.key")}
              options={KEYS}
              value={chart.meta.key ?? ""}
              onChange={(key) => change((c) => ({ ...c, meta: { ...c.meta, key } }))}
            />
            <Selector
              label={t("field.meter")}
              options={METERS}
              value={chart.meta.meter ?? "4/4"}
              onChange={(meter) => change((c) => ({ ...c, meta: { ...c.meta, meter } }))}
            />
          </HStack>
          <HStack gap={3} wrap="wrap">
            <TextInput
              label={t("field.tempo")}
              value={(chart.meta.tempo ?? "").split(" ")[0] ?? ""}
              onChange={(value) => {
                const unit = (chart.meta.tempo ?? "").split(" ")[1];
                const bpm = value.replace(/[^\d.]/g, "");
                change((c) => {
                  const meta = { ...c.meta };
                  if (bpm) meta.tempo = unit ? `${bpm} ${unit}` : bpm;
                  else delete meta.tempo;
                  return { ...c, meta };
                });
              }}
            />
            <Selector
              label={t("field.unit")}
              options={UNITS.map(([unit, name]) => ({
                value: unit || "none",
                label: t(`unit.${name}`),
              }))}
              value={(chart.meta.tempo ?? "").split(" ")[1] ?? "none"}
              onChange={(unit) => {
                const bpm = (chart.meta.tempo ?? "").split(" ")[0];
                if (!bpm) return;
                change((c) => ({
                  ...c,
                  meta: { ...c.meta, tempo: unit === "none" ? bpm : `${bpm} ${unit}` },
                }));
              }}
            />
            <TextInput
              label={t("field.feel")}
              value={chart.meta.feel ?? ""}
              isOptional
              onChange={(feel) =>
                change((c) => {
                  const meta = { ...c.meta };
                  if (feel) meta.feel = feel;
                  else delete meta.feel;
                  return { ...c, meta };
                })
              }
            />
          </HStack>
          <TextInput label={t("field.youtube")} value={youtube} onChange={setYoutube} isOptional />
          <HStack gap={3} wrap="wrap">
            <TextInput label={t("field.album")} value={album} onChange={setAlbum} isOptional />
            <TextInput label={t("field.year")} value={year} onChange={setYear} isOptional />
          </HStack>
          <RadioList
            label={t("field.source")}
            value={sourceType}
            onChange={setSourceType}
            orientation="horizontal"
          >
            {SOURCE_TYPES.map((type) => (
              <RadioListItem key={type} value={type} label={sources(type)} />
            ))}
          </RadioList>
          <HStack hAlign="end">
            <Button label={t("close")} variant="primary" onClick={() => setDetails(false)} />
          </HStack>
        </VStack>
      </Dialog>
    </Layout>
  );
}

/** A note for a section: for everyone, the MD's, or the MD's for some instruments and passes (R-13.14). */
function NoteDialog({
  open,
  section,
  instruments,
  onClose,
  onAdd,
}: {
  open: boolean;
  section: string;
  instruments: { value: string; label: string }[];
  onClose: () => void;
  onAdd: (note: VisualNote) => void;
}) {
  const t = useTranslations("visual");
  const [kind, setKind] = useState<"everyone" | "md">("md");
  const [role, setRole] = useState<string>(EVERYONE);
  const [passes, setPasses] = useState("");
  const [text, setText] = useState("");
  const reset = () => {
    setKind("md");
    setRole(EVERYONE);
    setPasses("");
    setText("");
  };
  return (
    <Dialog
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      padding={4}
      purpose="form"
    >
      <VStack gap={4}>
        <Heading level={2}>{t("note.title", { section })}</Heading>
        <RadioList
          label={t("note.kind")}
          value={kind}
          onChange={(value) => setKind(value as "everyone" | "md")}
          orientation="horizontal"
        >
          <RadioListItem value="md" label={t("note.md")} />
          <RadioListItem value="everyone" label={t("note.everyone")} />
        </RadioList>
        {kind === "md" && (
          <HStack gap={3} wrap="wrap">
            <Selector
              label={t("note.for")}
              options={[{ value: EVERYONE, label: t("note.wholeBand") }, ...instruments]}
              value={role}
              onChange={setRole}
            />
            <TextInput
              label={t("note.passes")}
              description={t("note.passesHint")}
              value={passes}
              onChange={(value) => setPasses(value.replace(/[^\d, ]/g, ""))}
              isOptional
            />
          </HStack>
        )}
        <TextInput label={t("note.text")} value={text} onChange={setText} isRequired />
        <HStack gap={2} hAlign="end">
          <Button
            label={t("cancel")}
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          />
          <Button
            label={t("note.add")}
            variant="primary"
            isDisabled={!text.trim()}
            onClick={() => {
              onAdd({
                md: kind === "md",
                roles: [kind === "md" ? role : EVERYONE],
                passes:
                  kind === "md"
                    ? passes
                        .split(/[ ,]+/)
                        .map(Number)
                        .filter((pass) => Number.isInteger(pass) && pass > 0)
                    : [],
                text: text.trim(),
              });
              reset();
            }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
