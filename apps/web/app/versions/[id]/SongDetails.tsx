"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Popover } from "@astryxdesign/core/Popover";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Text } from "@astryxdesign/core/Text";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { SOURCE_TYPES } from "../../../lib/versions/validate";
import { InlineText } from "./visual/InlineText";

/**
 * The song's details in one line, each changed right where it is (owner's design, R-13.2): who
 * arranged it, its source from a menu, then the album, the year, the feel where the editor keeps
 * it, and the YouTube link, written in place. One strip for both editors, so the Chart editor and
 * the visual editor open the same way (owner's review, October 28, 2026, T-3027).
 */
export function SongDetails({
  author,
  sourceType,
  onSourceType,
  album,
  onAlbum,
  year,
  onYear,
  feel,
  onFeel,
  youtube,
  onYoutube,
}: {
  author?: string | null | undefined;
  sourceType: string;
  onSourceType: (value: string) => void;
  album: string;
  onAlbum: (value: string) => void;
  year: string;
  onYear: (value: string) => void;
  /** The chart's feel, where it is kept outside the text (the visual editor). */
  feel?: string;
  onFeel?: (value: string) => void;
  youtube: string;
  onYoutube: (value: string) => void;
}) {
  const t = useTranslations("visual");
  const sources = useTranslations("version.source");
  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <Text weight="semibold">{t("details")}</Text>
      {author && <Text color="secondary">{t("arranger", { name: author })}</Text>}
      <Popover
        label={t("field.source")}
        content={
          <RadioList label={t("field.source")} value={sourceType} onChange={onSourceType}>
            {SOURCE_TYPES.map((type) => (
              <RadioListItem key={type} value={type} label={sources(type)} />
            ))}
          </RadioList>
        }
      >
        <Button
          label={sourceType ? sources(sourceType as "live") : t("field.source")}
          size="sm"
          variant="ghost"
          endContent={<Icon icon={ChevronDownIcon} />}
        />
      </Popover>
      <Text color="secondary">
        <InlineText label={t("field.album")} value={album} onChange={onAlbum} />
      </Text>
      <Text color="secondary">
        <InlineText label={t("field.year")} value={year} onChange={onYear} />
      </Text>
      {onFeel && (
        <Text color="secondary">
          <InlineText label={t("field.feel")} value={feel ?? ""} onChange={onFeel} />
        </Text>
      )}
      <Text color="secondary">
        <InlineText label={t("field.youtube")} value={youtube} onChange={onYoutube} />
      </Text>
    </HStack>
  );
}
