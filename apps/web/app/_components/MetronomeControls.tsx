"use client";

import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useMetronome } from "../../lib/metronome/useMetronome";

/** Where the metronome is in one section, as ChartSection draws it (R-11.3). */
export interface NowPlaying {
  row: number;
  index: number;
  /** The share of the bar's beats counted so far. */
  progress: number;
}

/**
 * The visual metronome's controls, the same in stand mode and on the version page (T-1503):
 * Play / Stop, the "2 / 4" counter, the question for a tempo when the chart has none (R-11.1),
 * and where the metronome is, section by section. Play starts at a section's first bar.
 */
export function useMetronomeControls(chart: Chart, startSection: number) {
  const t = useTranslations("stand");
  const metronome = useMetronome(chart);
  const [isTempoOpen, setTempoOpen] = useState(false);
  const [askedTempo, setAskedTempo] = useState(100);
  const playFrom = (tempo?: number) =>
    metronome.play(metronome.firstBarOf(startSection), tempo !== undefined ? { tempo } : {});

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

  // "2 / 4", the beat and the beats of the bar, so the pulse never rests on the line (R-11.3).
  const click = metronome.position?.click;
  const counter = click ? t("beatOf", { beat: click.count, of: click.of }) : null;
  const playing = metronome.position?.bar;
  const nowIn = (section: number): NowPlaying | undefined =>
    playing && playing.section === section && click
      ? {
          row: playing.row,
          index: playing.index,
          progress: (click.beat + 1) / Math.max(playing.beats.length, 1),
        }
      : undefined;

  return {
    metronome,
    playButton,
    tempoDialog,
    counter,
    nowIn,
    playingSection: playing?.section,
    queued: metronome.queued,
    queue: metronome.queue,
    isPlaying: metronome.isPlaying,
  };
}
