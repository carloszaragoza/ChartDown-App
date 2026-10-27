"use client";

import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Popover } from "@astryxdesign/core/Popover";
import { Text } from "@astryxdesign/core/Text";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { UNITS, type VisualChart } from "../../../../lib/visual/model";
import { addTap, tapTempo } from "../../../../lib/visual/tap";
import { SongName } from "../edit/SongName";

type Meta = VisualChart["meta"];

const MAJOR = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
// The meter's two rows (R-13.2): the beats in a bar, and the beat's note.
const BEATS = [2, 3, 4, 5, 6, 7, 9, 12];
const NOTES = [2, 4, 8];

const chevron = <Icon icon={ChevronDownIcon} />;

/** The tempo's beats per minute and what they count, from `72 q`. */
const tempoParts = (tempo: string | undefined) => {
  const [bpm = "", unit = ""] = (tempo ?? "").split(" ");
  return { bpm, unit };
};

/**
 * The chart's header, changed right where it is (R-13.2): a tap on the title or the artists edits them, the key
 * opens the keys, the tempo a number and Tap, the meter its two rows and what the tempo counts.
 */
export function HeaderFields({
  versionId,
  title,
  artists,
  canRename,
  meta,
  onMeta,
  onRenamed,
  subtitle,
}: {
  versionId: string;
  title: string;
  artists: string[];
  /** Whether this person may rename the song: an administrator, or its only owner (R-02.2). */
  canRename: boolean;
  meta: Meta;
  onMeta: (change: (meta: Meta) => Meta) => void;
  onRenamed: (title: string, artists: string[]) => void;
  /** What goes under the song's names: the arranger. */
  subtitle?: ReactNode;
}) {
  const t = useTranslations("visual");
  const [taps, setTaps] = useState<number[]>([]);
  const { bpm, unit } = tempoParts(meta.tempo);
  const meter = meta.meter ?? "4/4";
  const [beats = "4", note = "4"] = meter.split("/");

  const setTempo = (nextBpm: string, nextUnit: string) =>
    onMeta((current) => {
      const next = { ...current };
      if (nextBpm) next.tempo = nextUnit ? `${nextBpm} ${nextUnit}` : nextBpm;
      else delete next.tempo;
      return next;
    });

  // The song's title and artists, written in place as in the Chart editor (R-13.2, R-02.2).
  const titleView = (
    <SongName
      versionId={versionId}
      title={title}
      artists={artists}
      canRename={canRename}
      onRenamed={onRenamed}
    />
  );

  const keyPicker = (
    <VStack gap={2}>
      {[
        ["major", MAJOR],
        ["minor", MINOR],
      ].map(([name, keys]) => (
        <VStack key={name as string} gap={1}>
          <Text type="label">{t(`keys.${name as "major"}`)}</Text>
          <Grid columns={6} gap={1}>
            {(keys as string[]).map((key) => (
              <ToggleButton
                key={key}
                label={key}
                isPressed={meta.key === key}
                onPressedChange={() => onMeta((current) => ({ ...current, key }))}
              >
                {key}
              </ToggleButton>
            ))}
          </Grid>
        </VStack>
      ))}
    </VStack>
  );

  const tapped = tapTempo(taps);
  const tempoPicker = (
    <VStack gap={3}>
      <NumberInput
        label={t("field.tempo")}
        value={bpm ? Number(bpm) : null}
        min={20}
        max={320}
        onChange={(value) => setTempo(value ? String(Math.round(value)) : "", unit)}
      />
      <VStack gap={1}>
        <Button
          label={t("tap")}
          size="lg"
          width="100%"
          onClick={() => {
            const next = addTap(taps, performance.now());
            setTaps(next);
            const found = tapTempo(next);
            if (found) setTempo(String(found), unit);
          }}
        />
        <Text type="supporting" role="status">
          {tapped ? t("tapCount", { bpm: tapped, count: taps.length }) : t("tapHint")}
        </Text>
      </VStack>
    </VStack>
  );

  const timePicker = (
    <VStack gap={3}>
      <VStack gap={1}>
        <Text type="label">{t("meterBeats")}</Text>
        <HStack gap={1} wrap="wrap" role="group" aria-label={t("meterBeats")}>
          {BEATS.map((value) => (
            <ToggleButton
              key={value}
              label={String(value)}
              isPressed={beats === String(value)}
              onPressedChange={() =>
                onMeta((current) => ({ ...current, meter: `${value}/${note}` }))
              }
            >
              {String(value)}
            </ToggleButton>
          ))}
        </HStack>
      </VStack>
      <VStack gap={1}>
        <Text type="label">{t("meterNote")}</Text>
        <HStack gap={1} wrap="wrap" role="group" aria-label={t("meterNote")}>
          {NOTES.map((value) => (
            <ToggleButton
              key={value}
              label={String(value)}
              isPressed={note === String(value)}
              onPressedChange={() =>
                onMeta((current) => ({ ...current, meter: `${beats}/${value}` }))
              }
            >
              {String(value)}
            </ToggleButton>
          ))}
        </HStack>
      </VStack>
      <VStack gap={1}>
        <Text type="label">{t("field.unit")}</Text>
        <HStack gap={1} wrap="wrap" role="group" aria-label={t("field.unit")}>
          {UNITS.map(([value, name]) => (
            <ToggleButton
              key={name}
              label={t(`unit.${name}`)}
              isPressed={unit === value}
              isDisabled={!bpm}
              onPressedChange={() => setTempo(bpm, value)}
            >
              {t(`unit.${name}`)}
            </ToggleButton>
          ))}
        </HStack>
        {!bpm && <Text type="supporting">{t("unitNeedsTempo")}</Text>}
      </VStack>
    </VStack>
  );

  return (
    <VStack gap={2}>
      {titleView}
      {subtitle}
      <HStack gap={2} wrap="wrap">
        <Popover content={keyPicker} label={t("field.key")} width={420}>
          <Button
            label={meta.key ? t("header.key", { key: meta.key }) : t("field.key")}
            endContent={chevron}
          />
        </Popover>
        <Popover
          content={tempoPicker}
          label={t("field.tempo")}
          width={320}
          onOpenChange={(open) => open && setTaps([])}
        >
          <Button
            label={bpm ? t("header.tempoButton", { tempo: bpm }) : t("field.tempo")}
            endContent={chevron}
          />
        </Popover>
        <Popover content={timePicker} label={t("field.meter")} width={480}>
          <Button label={t("header.time", { meter })} endContent={chevron} />
        </Popover>
      </HStack>
    </VStack>
  );
}
