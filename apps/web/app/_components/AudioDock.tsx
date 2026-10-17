"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  MinusIcon,
  MusicalNoteIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { storedAudio } from "../../lib/offline/store";
import { createClient } from "../../lib/supabase/browser";
import { videoClock } from "../../lib/video/clock";
import { sectionAt, videoSections } from "../../lib/video/sections";

/** A band's recording of a version, as the player needs it (R-06.7). */
export interface PlayerRecording {
  bandId: string;
  versionId: string;
  band: string;
  durationMs: number;
  /** The waveform, 0 to 1000. */
  peaks: number[];
  musicStartMs: number;
}

// The waveform is drawn with this many bars, whatever the recording's length.
const BARS = 160;

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Plays the band's recording (R-06.7, T-2603): the button opens a thin player at the bottom of the
 * page with the recording's waveform and the song's sections over it; the mark follows the audio,
 * a section takes it there, and the chart on the page follows it bar by bar, as with the video
 * (R-03.11). The MD adjusts where the music starts and saves it for the band.
 */
export function AudioButton({
  recording,
  chart,
  save,
}: {
  recording: PlayerRecording;
  chart: Chart;
  /** For the band's MD: saves where the music starts, in milliseconds. */
  save?: ((milliseconds: number) => Promise<boolean>) | undefined;
}) {
  const t = useTranslations("audio");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        label={t("play", { band: recording.band })}
        tooltip={t("playShort")}
        variant="ghost"
        size="sm"
        icon={<Icon icon={PlayIcon} />}
        isIconOnly
        onClick={() => setOpen(true)}
      />
      {open &&
        createPortal(
          <AudioDock
            recording={recording}
            chart={chart}
            save={save}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function AudioDock({
  recording,
  chart,
  save,
  onClose,
}: {
  recording: PlayerRecording;
  chart: Chart;
  save: ((milliseconds: number) => Promise<boolean>) | undefined;
  onClose: () => void;
}) {
  const t = useTranslations("audio");
  const v = useTranslations("video");
  const audio = useRef<HTMLAudioElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [musicStart, setMusicStart] = useState(recording.musicStartMs / 1000);
  const [stored, setStored] = useState(recording.musicStartMs / 1000);
  const [saving, setSaving] = useState<"idle" | "saving" | "failed">("idle");
  const duration = recording.durationMs / 1000;
  const sections = useMemo(() => videoSections(chart, musicStart), [chart, musicStart]);
  const bars = useMemo(() => {
    const peaks = recording.peaks;
    if (peaks.length === 0) return [];
    return Array.from({ length: BARS }, (_, bar) => {
      const from = Math.floor((bar * peaks.length) / BARS);
      const to = Math.max(from + 1, Math.floor(((bar + 1) * peaks.length) / BARS));
      return Math.max(...peaks.slice(from, to)) / 1000;
    });
  }, [recording.peaks]);

  // The file kept with a downloaded set plays with no connection (T-2604); otherwise it comes
  // from the band's private storage, readable by its members only.
  const { bandId, versionId } = recording;
  useEffect(() => {
    let url: string | null = null;
    let gone = false;
    const show = (data: Blob) => {
      url = URL.createObjectURL(data);
      setSource(url);
    };
    void storedAudio({ bandId, versionId }).then(async (kept) => {
      if (gone) return;
      if (kept) return show(kept);
      const { data, error } = await createClient()
        .storage.from("band-audio")
        .download(`${bandId}/${versionId}`);
      if (gone) return;
      if (error || !data) return setFailed(true);
      show(data);
    });
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bandId, versionId]);

  // The chart follows the audio, through the same clock as the video (T-2504).
  useEffect(() => {
    const timer = window.setInterval(() => {
      const element = audio.current;
      if (!element) return;
      setNow(element.currentTime);
      videoClock.set({ time: element.currentTime, musicStart, playing: !element.paused });
    }, 100);
    return () => window.clearInterval(timer);
  }, [musicStart]);
  useEffect(() => () => videoClock.set(null), []);

  const seek = (seconds: number) => {
    const element = audio.current;
    const to = Math.min(Math.max(0, seconds), duration);
    if (element) element.currentTime = to;
    setNow(to);
  };
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
  };
  const playingSection = sections ? sectionAt(sections, now) : -1;

  return (
    <aside className="cd-audio-dock" aria-label={t("player")}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Button
            label={playing ? t("pause") : t("playShort")}
            variant="primary"
            icon={<Icon icon={playing ? PauseIcon : PlayIcon} />}
            isIconOnly
            isDisabled={!source}
            onClick={toggle}
          />
          <StackItem size="fill">
            <HStack gap={1} vAlign="center">
              <Icon icon={MusicalNoteIcon} />
              <Text type="supporting">
                {recording.band} · {clock(now)} / {clock(duration)}
              </Text>
            </HStack>
          </StackItem>
          <Button
            label={t("close")}
            variant="ghost"
            size="sm"
            icon={<Icon icon={XMarkIcon} />}
            isIconOnly
            tooltip={t("close")}
            onClick={onClose}
          />
        </HStack>
        {failed && (
          <div role="alert">
            <Text type="supporting">{t("errors.unavailable")}</Text>
          </div>
        )}
        <div className="cd-audio-wave">
          <div className="cd-audio-wave__bars" aria-hidden="true">
            {bars.map((height, index) => (
              <span
                key={index}
                className="cd-audio-wave__bar"
                data-played={(index + 0.5) / BARS <= now / duration ? "" : undefined}
                style={{ blockSize: `${Math.max(height, 0.04) * 100}%` }}
              />
            ))}
          </div>
          {sections && (
            <div className="cd-audio-wave__sections" role="group" aria-label={v("sections")}>
              {sections.map((section, index) => (
                <button
                  key={`${section.section}-${index}`}
                  type="button"
                  className="cd-audio-wave__section"
                  style={{
                    insetInlineStart: `${(section.start / duration) * 100}%`,
                    inlineSize: `${((section.end - section.start) / duration) * 100}%`,
                  }}
                  aria-label={v("goTo", { name: section.name })}
                  aria-current={index === playingSection ? "true" : undefined}
                  title={section.name}
                  onClick={() => seek(section.start)}
                >
                  {section.name}
                </button>
              ))}
            </div>
          )}
          <span
            className="cd-audio-wave__mark"
            aria-hidden="true"
            style={{ insetInlineStart: `${Math.min(now / duration, 1) * 100}%` }}
          />
        </div>
        {sections ? (
          <HStack gap={1} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <Text type="supporting">{v("musicStarts", { time: clock(musicStart) })}</Text>
            </StackItem>
            <Button
              label={v("earlier")}
              variant="ghost"
              size="sm"
              icon={<Icon icon={MinusIcon} />}
              isIconOnly
              tooltip={v("earlier")}
              onClick={() => setMusicStart((at) => Math.max(0, at - 0.25))}
            />
            <Button
              label={v("later")}
              variant="ghost"
              size="sm"
              icon={<Icon icon={PlusIcon} />}
              isIconOnly
              tooltip={v("later")}
              onClick={() => setMusicStart((at) => Math.min(duration, at + 0.25))}
            />
            <Button
              label={v("startHere")}
              variant="ghost"
              size="sm"
              onClick={() => setMusicStart(Math.round(now * 100) / 100)}
            />
            {save && musicStart !== stored && (
              <Button
                label={t("saveStart")}
                size="sm"
                isLoading={saving === "saving"}
                onClick={() => {
                  setSaving("saving");
                  void save(Math.round(musicStart * 1000)).then((done) => {
                    setSaving(done ? "idle" : "failed");
                    if (done) setStored(musicStart);
                  });
                }}
              />
            )}
          </HStack>
        ) : (
          <Text type="supporting">{v("noTempo")}</Text>
        )}
        {saving === "failed" && (
          <div role="alert">
            <Text type="supporting">{v("saveFailed")}</Text>
          </div>
        )}
        {source && (
          <audio
            ref={audio}
            src={source}
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        )}
      </VStack>
    </aside>
  );
}
