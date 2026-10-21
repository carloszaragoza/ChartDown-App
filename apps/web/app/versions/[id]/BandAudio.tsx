"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog } from "@astryxdesign/core/Dialog";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { MusicalNoteIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { audioProblem, audioType, MAX_AUDIO_BYTES, peaksFrom } from "../../../lib/audio/file";
import { createClient } from "../../../lib/supabase/browser";
import type { Chart } from "chartdown";
import { AudioButton } from "../../_components/AudioDock";
import { recordAudio, removeAudio, saveAudioStart } from "./audio";

/** A band's recording of this version, as its members see it. */
export interface BandRecording {
  bandId: string;
  band: string;
  durationMs: number;
  peaks: number[];
  musicStartMs: number;
  /** The person can replace or remove it: the band's MD. */
  canArrange: boolean;
}

// The band's MD adds a recording from the version's "…" menu (T-2806), which opens this dialog.
const ADD_AUDIO = "cd:add-band-audio";

/** Opens the dialog that adds the band's audio. */
export function openAddAudio(): void {
  window.dispatchEvent(new Event(ADD_AUDIO));
}

const minutes = (milliseconds: number) => {
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/**
 * The bands' recordings of this version (R-06.7, T-2602): each band's members see theirs; the
 * band's MD adds one from the "…" menu, replaces it or removes it. The browser checks the file (MP3 or M4A, at most
 * 15 MB), reads its length and waveform, and uploads it to the band's private storage.
 */
export function BandAudio({
  versionId,
  recordings,
  bands,
  chart,
}: {
  versionId: string;
  /** The chart the player places its sections on (T-2603). */
  chart: Chart;
  recordings: BandRecording[];
  /** The bands whose recording this person may add: those they arrange. */
  bands: { id: string; name: string }[];
}) {
  const t = useTranslations("audio");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [band, setBand] = useState(bands[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "failed" | "type" | "size" | "unreadable">(
    "idle",
  );

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(ADD_AUDIO, show);
    return () => window.removeEventListener(ADD_AUDIO, show);
  }, []);

  const choose = (picked: File | File[] | null) => {
    const one = Array.isArray(picked) ? (picked[0] ?? null) : picked;
    setFile(one);
    setState(one ? (audioProblem(one) ?? "idle") : "idle");
  };

  const upload = async () => {
    if (!file || !band) return;
    const type = audioType(file);
    if (!type || audioProblem(file)) return;
    setState("busy");
    let durationMs = 0;
    let peaks: number[] = [];
    try {
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      durationMs = decoded.duration * 1000;
      peaks = peaksFrom(
        Array.from({ length: decoded.numberOfChannels }, (_, index) =>
          decoded.getChannelData(index),
        ),
      );
      void context.close();
    } catch {
      setState("unreadable");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("band-audio")
      .upload(`${band}/${versionId}`, file, { upsert: true, contentType: type });
    if (error) return setState("failed");
    const done = await recordAudio({
      bandId: band,
      versionId,
      size: file.size,
      durationMs,
      contentType: type,
      peaks,
    });
    if (!done) return setState("failed");
    setOpen(false);
    setFile(null);
    setRights(false);
    setState("idle");
    router.refresh();
  };

  if (recordings.length === 0 && bands.length === 0) return null;
  return (
    <VStack gap={1}>
      {recordings.map((recording) => (
        <HStack key={recording.bandId} gap={2} vAlign="center" wrap="wrap">
          <Icon icon={MusicalNoteIcon} />
          <Text>
            {t("recording", { band: recording.band, length: minutes(recording.durationMs) })}
          </Text>
          <AudioButton
            recording={{ ...recording, versionId }}
            chart={chart}
            save={
              recording.canArrange
                ? (milliseconds) => saveAudioStart(recording.bandId, versionId, milliseconds)
                : undefined
            }
          />
          {recording.canArrange && (
            <Button
              label={t("remove", { band: recording.band })}
              tooltip={t("removeShort")}
              variant="ghost"
              size="sm"
              icon={<Icon icon={TrashIcon} />}
              isIconOnly
              onClick={() =>
                void removeAudio(recording.bandId, versionId).then(() => router.refresh())
              }
            />
          )}
        </HStack>
      ))}
      <Dialog isOpen={open} onOpenChange={setOpen} padding={4}>
        <VStack gap={4}>
          <Heading level={2}>{t("addTitle")}</Heading>
          <Text color="secondary">{t("addIntro")}</Text>
          {bands.length === 1 && (
            <Text weight="semibold">{t("for", { band: bands[0]?.name ?? "" })}</Text>
          )}
          {bands.length > 1 && (
            <Selector
              label={t("band")}
              options={bands.map((choice) => ({ value: choice.id, label: choice.name }))}
              value={band}
              onChange={setBand}
            />
          )}
          <FileInput
            label={t("file")}
            description={t("fileHint")}
            accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
            maxSize={MAX_AUDIO_BYTES}
            value={file}
            onChange={choose}
          />
          {recordings.some((recording) => recording.bandId === band) && (
            <Text type="supporting">{t("replaces")}</Text>
          )}
          <CheckboxInput label={t("rights")} value={rights} onChange={setRights} />
          {(state === "type" ||
            state === "size" ||
            state === "unreadable" ||
            state === "failed") && (
            <div role="alert">
              <Banner status="error" title={t(`errors.${state}`)} />
            </div>
          )}
          <HStack gap={2} hAlign="end">
            <Button label={t("cancel")} variant="ghost" onClick={() => setOpen(false)} />
            <Button
              label={t("upload")}
              variant="primary"
              isLoading={state === "busy"}
              isDisabled={!file || !rights || !band || audioProblem(file) !== null}
              onClick={() => void upload()}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  );
}
