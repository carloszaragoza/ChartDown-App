"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { MusicalNoteIcon, PauseIcon, PlayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Chart } from "chartdown";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { storedAudio } from "../../lib/offline/store";
import { createClient } from "../../lib/supabase/browser";
import { videoClock } from "../../lib/video/clock";
import { videoSections } from "../../lib/video/sections";
import { windowWave } from "../../lib/video/wave";
import { useDockRoom, useDockTarget } from "./DockRoom";
import {
  MusicPointsControls,
  PlayerVolume,
  SectionCells,
  useCanSetVolume,
  useMusicEnd,
  usePlayerStart,
} from "./PlayerBar";
import type { MusicPoints } from "../../lib/video/points";

/** A band's recording of a version, as the player needs it (R-06.7). */
export interface PlayerRecording {
  bandId: string;
  versionId: string;
  band: string;
  durationMs: number;
  /** The waveform, 0 to 1000. */
  peaks: number[];
  musicStartMs: number;
  /** Where the music ends, when the MD saved it (T-2830). */
  musicEndMs?: number | null;
}

// The waveform is drawn with this many bars, whatever the recording's length.
const BARS = 160;

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Plays the band's recording (R-06.7, T-2603): the button opens a player across the bottom of the
 * page (T-2828) with the song's sections and the recording's waveform under them; the mark follows the audio,
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
  save?: ((points: MusicPoints) => Promise<boolean>) | undefined;
}) {
  const t = useTranslations("audio");
  const [open, setOpen] = useState(false);
  const target = useDockTarget();
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
        target &&
        createPortal(
          <AudioDock
            recording={recording}
            chart={chart}
            save={save}
            onClose={() => setOpen(false)}
          />,
          target,
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
  save: ((points: MusicPoints) => Promise<boolean>) | undefined;
  onClose: () => void;
}) {
  const t = useTranslations("audio");
  const v = useTranslations("video");
  const audio = useRef<HTMLAudioElement>(null);
  const dock = useRef<HTMLElement>(null);
  useDockRoom(dock);
  const playerStart = usePlayerStart(dock);
  // The recording's volume (T-2828), where the browser lets a page set it.
  const canSetVolume = useCanSetVolume();
  const [volume, setVolume] = useState(100);
  const changeVolume = (to: number) => {
    setVolume(to);
    if (audio.current) audio.current.volume = to / 100;
  };
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [musicStart, setMusicStart] = useState(recording.musicStartMs / 1000);
  const [stored, setStored] = useState(recording.musicStartMs / 1000);
  // Where the music ends, when it is set: the recording pauses there (T-2830).
  const savedEnd = recording.musicEndMs == null ? null : recording.musicEndMs / 1000;
  const [musicEnd, setMusicEnd] = useState(savedEnd);
  const [storedEnd, setStoredEnd] = useState(savedEnd);
  const keepWithin = useMusicEnd(musicEnd, musicStart);
  const [saving, setSaving] = useState<"idle" | "saving" | "failed">("idle");
  const duration = recording.durationMs / 1000;
  const sections = useMemo(() => videoSections(chart, musicStart), [chart, musicStart]);
  // The recording's waveform across the sections, from the first one's start to the last one's
  // end (T-2829).
  const wave = useMemo(
    () =>
      sections
        ? windowWave(
            recording.peaks,
            duration,
            sections[0]?.start ?? 0,
            sections.at(-1)?.end ?? duration,
            BARS,
          )
        : [],
    [recording.peaks, duration, sections],
  );

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
      keepWithin(
        element.currentTime,
        !element.paused,
        () => element.pause(),
        (to) => {
          element.currentTime = to;
        },
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [musicStart, keepWithin]);
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
  return (
    <aside
      ref={dock}
      className="cd-player"
      style={{ insetInlineStart: playerStart }}
      aria-label={t("player")}
    >
      {/* Every control in one row along the top (T-2828). */}
      <div className="cd-player__controls">
        <MusicPointsControls
          start={musicStart}
          end={musicEnd}
          now={now}
          step={0.25}
          max={duration}
          onStart={setMusicStart}
          onEnd={setMusicEnd}
          saveLabel={
            save && (musicStart !== stored || musicEnd !== storedEnd) ? t("saveStart") : undefined
          }
          isSaving={saving === "saving"}
          onSave={() => {
            if (!save) return;
            setSaving("saving");
            void save({
              startMs: Math.round(musicStart * 1000),
              endMs: musicEnd === null ? null : Math.round(musicEnd * 1000),
            }).then((done) => {
              setSaving(done ? "idle" : "failed");
              if (done) {
                setStored(musicStart);
                setStoredEnd(musicEnd);
              }
            });
          }}
        />
        {!sections && <Text type="supporting">{v("noTempo")}</Text>}
        <HStack gap={1} vAlign="center">
          <Icon icon={MusicalNoteIcon} />
          <Text type="supporting" maxLines={1}>
            {recording.band} · {clock(now)} / {clock(duration)}
          </Text>
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
      </div>
      {(failed || saving === "failed") && (
        <div role="alert">
          <Text type="supporting">{failed ? t("errors.unavailable") : v("saveFailed")}</Text>
        </div>
      )}
      <div className="cd-player__body">
        <div className="cd-player__play">
          <Button
            label={playing ? t("pause") : t("playShort")}
            variant="primary"
            size="lg"
            icon={<Icon icon={playing ? PauseIcon : PlayIcon} />}
            isIconOnly
            isDisabled={!source}
            onClick={toggle}
          />
        </div>
        {canSetVolume && (
          <PlayerVolume label={t("volume")} value={volume} onChange={changeVolume} />
        )}
        <div className="cd-player__main">
          {sections && (
            <SectionCells
              chart={chart}
              sections={sections}
              now={now}
              onSeek={seek}
              label={v("sections")}
              goTo={(name) => v("goTo", { name })}
              wave={wave}
            />
          )}
        </div>
      </div>
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
    </aside>
  );
}
