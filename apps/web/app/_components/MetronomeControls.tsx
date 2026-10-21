"use client";

import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Slider } from "@astryxdesign/core/Slider";
import { StackItem } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  AdjustmentsVerticalIcon,
  MinusIcon,
  PlayIcon,
  PlusIcon,
  SpeakerWaveIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { speedFor, tapTempo } from "../../lib/metronome/tapTempo";
import {
  clampTempo,
  practiceTempo,
  roundTempo,
  speedForTempo,
  TEMPO_MAX,
  TEMPO_MIN,
} from "../../lib/metronome/practiceTempo";
import { MetronomeIcon } from "./MetronomeIcon";
import { useMetronome } from "../../lib/metronome/useMetronome";

/** Where the metronome is in one section, as ChartSection draws it (R-11.3). */
export interface NowPlaying {
  row: number;
  index: number;
  /** The share of the bar's beats counted so far. */
  progress: number;
  /** It is on beat 1, drawn accented. */
  downbeat: boolean;
}

/** A bar chosen to start on, where ChartSection draws it (R-11.2). */
export interface StartBar {
  row: number;
  index: number;
}

/**
 * The visual metronome's controls, the same in stand mode and on the version page (T-1503):
 * Play / Stop, the "2 / 4" counter, the question for a tempo when the chart has none (R-11.1),
 * and where the metronome is, section by section. Play starts on a tapped bar (R-11.2), or at
 * the first bar of `section` (stand mode's own) or of the song (null). A fermata waits for a tap
 * on the chart (R-11.6).
 */
export function useMetronomeControls(chart: Chart, section: number | null) {
  const t = useTranslations("stand");
  const metronome = useMetronome(chart);
  const { bars } = metronome;
  const [isTempoOpen, setTempoOpen] = useState(false);
  const [isSoundOpen, setSoundOpen] = useState(false);
  const [askedTempo, setAskedTempo] = useState(100);
  // The tapped bar, by its place in the timeline; in stand mode only one of the section on screen.
  const [chosen, setChosen] = useState<number | null>(null);
  const start =
    chosen !== null && (section === null || bars[chosen]?.section === section) ? chosen : null;
  // Practice (R-11.9): a share of the chart's tempo, or a tempo tapped in; the chart never changes.
  const written = bars[0]?.tempo;
  const [speed, setSpeed] = useState(100);
  const [tapped, setTapped] = useState<number | null>(null);
  const taps = useRef<number[]>([]);
  const tap = () => {
    taps.current = [...taps.current, performance.now()].slice(-12);
    const bpm = tapTempo(taps.current);
    if (bpm === null) return;
    if (written) setSpeed(Math.min(200, Math.max(25, Math.round(speedFor(bpm, written) * 100))));
    else setTapped(bpm);
  };
  const playFrom = (tempo?: number) =>
    metronome.play(start ?? metronome.firstBarOf(section ?? 0), {
      ...(tempo !== undefined ? { tempo } : {}),
      speed: speed / 100,
    });
  /** A tap on a bar: start there, or, tapped again, from the top as before (R-11.2). */
  const chooseStart = (inSection: number, number: number) => {
    const index = bars.findIndex((bar) => bar.section === inSection && bar.number === number);
    if (index >= 0) setChosen((now) => (now === index ? null : index));
  };
  const startIn = (inSection: number): StartBar | undefined => {
    const bar = start !== null ? bars[start] : undefined;
    return bar && bar.section === inSection ? { row: bar.row, index: bar.index } : undefined;
  };

  /** Play or Stop, from the button or the space bar (R-11.10). */
  const toggle = () => {
    if (metronome.isPlaying) metronome.stop();
    else if (metronome.needsTempo && tapped === null) setTempoOpen(true);
    else playFrom(tapped ?? undefined);
  };
  const playButton = (
    <Button
      label={metronome.isPlaying ? t("stop") : t("play")}
      size="lg"
      variant={metronome.isPlaying ? "primary" : "secondary"}
      isIconOnly
      icon={<Icon icon={metronome.isPlaying ? StopIcon : PlayIcon} />}
      onClick={toggle}
    />
  );

  const tempoDialog = (
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
  );

  // The click (off by default), its volume and the count-in, kept on this device (R-11.7, R-11.8).
  const { sound, setSound } = metronome;
  // The tempo stepper (T-2808): the practice tempo in beats per minute, from the chart's own; on a
  // chart with no tempo, the tempo asked for.
  const stepped = written ? practiceTempo(written, speed) : clampTempo(tapped ?? askedTempo);
  const step = (bpm: number) => {
    if (written) setSpeed(speedForTempo(bpm, written));
    else setTapped(clampTempo(bpm));
  };
  const tempoHint = !written
    ? t("tempoNone")
    : stepped === roundTempo(written)
      ? t("tempoSame")
      : t("tempoChart", { bpm: roundTempo(written) });
  const soundControls = (
    <VStack gap={4}>
      {/* − and + at the touch size beside the field, which also takes a typed tempo (T-2808). */}
      <VStack gap={2}>
        <VStack gap={0.5}>
          <Text type="label">{t("tempoTitle")}</Text>
          <Text type="supporting">{tempoHint}</Text>
        </VStack>
        <HStack gap={2} vAlign="center">
          <Button
            label={t("slower")}
            tooltip={t("slower")}
            size="lg"
            variant="secondary"
            isIconOnly
            icon={<Icon icon={MinusIcon} />}
            isDisabled={stepped <= TEMPO_MIN}
            onClick={() => step(stepped - 1)}
          />
          <StackItem size="fill">
            <NumberInput
              label={t("tempoTitle")}
              isLabelHidden
              value={stepped}
              min={TEMPO_MIN}
              max={TEMPO_MAX}
              step={1}
              isWheelEnabled={false}
              units="bpm"
              size="lg"
              onChange={step}
            />
          </StackItem>
          <Button
            label={t("faster")}
            tooltip={t("faster")}
            size="lg"
            variant="secondary"
            isIconOnly
            icon={<Icon icon={PlusIcon} />}
            isDisabled={stepped >= TEMPO_MAX}
            onClick={() => step(stepped + 1)}
          />
        </HStack>
      </VStack>
      <Switch
        label={t("click")}
        description={t("clickHint")}
        value={sound.click}
        onChange={(click) => setSound({ ...sound, click })}
      />
      <Slider
        label={t("volume")}
        value={sound.volume}
        min={0}
        max={100}
        step={5}
        valueDisplay="text"
        formatValue={(volume) => `${volume}%`}
        onChange={(volume: number) => setSound({ ...sound, volume })}
      />
      <Slider
        label={t("speed")}
        value={speed}
        min={25}
        max={200}
        step={5}
        valueDisplay="text"
        formatValue={(value) =>
          t("speedValue", {
            speed: Math.round(value),
            bpm: practiceTempo(written ?? tapped ?? askedTempo, value),
          })
        }
        marks={[{ value: 100 }]}
        onChange={(value: number) => setSpeed(value)}
      />
      <HStack gap={2} wrap="wrap">
        <Button label={t("tapTempo")} variant="secondary" onClick={tap} />
        {(speed !== 100 || tapped !== null) && (
          <Button
            label={t("chartTempo")}
            variant="ghost"
            onClick={() => {
              setSpeed(100);
              setTapped(null);
              taps.current = [];
            }}
          />
        )}
      </HStack>
      <Switch
        label={t("countIn")}
        description={t("countInHint")}
        value={sound.countIn}
        onChange={(countIn) => setSound({ ...sound, countIn })}
      />
    </VStack>
  );
  const soundButton = (
    <Button
      label={t("sound")}
      size="lg"
      variant="secondary"
      isIconOnly
      icon={<Icon icon={SpeakerWaveIcon} />}
      onClick={() => setSoundOpen(true)}
    />
  );
  // The options open from the bottom, as stand mode's View does, so both read the same.
  const soundDialog = (
    <BottomSheet isOpen={isSoundOpen} onOpenChange={setSoundOpen} label={t("sound")} height="hug">
      <VStack gap={4} padding={4}>
        <Heading level={2}>{t("sound")}</Heading>
        {soundControls}
      </VStack>
    </BottomSheet>
  );

  // "2 / 4", the beat and the beats of the bar, so the pulse never rests on the line (R-11.3).
  const click = metronome.position?.click;
  const startBar = start !== null ? bars[start] : undefined;
  const counter = metronome.isWaiting
    ? t("fermata")
    : click
      ? t("beatOf", { beat: click.count, of: click.of })
      : startBar && !metronome.isPlaying
        ? t("startsAt", { bar: startBar.number })
        : null;
  const playing = metronome.position?.bar;
  const nowIn = (section: number): NowPlaying | undefined =>
    playing && playing.section === section && click
      ? {
          row: playing.row,
          index: playing.index,
          progress: (click.beat + 1) / Math.max(playing.beats.length, 1),
          downbeat: click.accent,
        }
      : undefined;

  // The metronome as one control (T-2701): Play with the tempo on it, the beat counter while it
  // plays, and its options beside it. The same control in stand mode, on the version page and on
  // a set's song.
  const shownTempo = written
    ? practiceTempo(written, speed)
    : tapped !== null
      ? roundTempo(tapped)
      : null;
  const control = (
    <ButtonGroup label={t("metronome")} size="lg">
      <Button
        label={metronome.isPlaying ? t("stop") : t("play")}
        variant={metronome.isPlaying ? "primary" : "secondary"}
        // The metronome, its pendulum swinging with the beat while it plays. Play and Stop are
        // its name, and the button turns primary and counts while it plays.
        icon={
          <MetronomeIcon
            width="1.25em"
            height="1.25em"
            beat={metronome.isPlaying && click ? click.count : undefined}
            seconds={click?.duration}
          />
        }
        onClick={toggle}
      >
        {/* One width whatever it shows, the tempo or the count (T-2701). */}
        <span className="cd-metronome-count">
          {(metronome.isPlaying && counter) ||
            (shownTempo !== null ? t("tempoShort", { bpm: shownTempo }) : t("noTempoShort"))}
        </span>
      </Button>
      <Button
        label={t("sound")}
        variant={metronome.isPlaying ? "primary" : "secondary"}
        isIconOnly
        icon={<Icon icon={AdjustmentsVerticalIcon} />}
        tooltip={t("sound")}
        onClick={() => setSoundOpen(true)}
      />
    </ButtonGroup>
  );

  return {
    metronome,
    control,
    playButton,
    soundButton,
    soundControls,
    tempoDialog: (
      <>
        {tempoDialog}
        {soundDialog}
      </>
    ),
    counter,
    nowIn,
    playingSection: playing?.section,
    /** The bar playing, by its place in the timeline. */
    playingAt: click && click.bar >= 0 ? click.bar : undefined,
    /** Playing the count-in bar, before the song's first bar. */
    isCountingIn: metronome.isPlaying && click?.bar === -1,
    queued: metronome.queued,
    queue: metronome.queue,
    isPlaying: metronome.isPlaying,
    isWaiting: metronome.isWaiting,
    toggle,
    resume: metronome.resume,
    chooseStart,
    startIn,
  };
}
