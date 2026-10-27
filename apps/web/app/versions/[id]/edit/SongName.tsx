"use client";

import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { renameSong } from "./actions";

/** Artists as typed in one line: "Mitch Wong, The Belonging Co". */
const splitArtists = (text: string) =>
  text
    .split(",")
    .map((artist) => artist.trim())
    .filter(Boolean);

/**
 * The song's title and artists in the editor's header (R-02.2, T-2848): who may rename the song
 * taps or clicks either and writes in place, in the same text; Enter keeps the change, Esc puts it
 * back. Anyone else reads them as they are.
 */
export function SongName({
  versionId,
  title,
  artists,
  canRename,
  onRenamed,
}: {
  versionId: string;
  title: string;
  artists: string[];
  canRename: boolean;
  onRenamed: (title: string, artists: string[]) => void;
}) {
  const t = useTranslations("editor.rename");
  const [state, setState] = useState<"idle" | "saving" | "invalid" | "refused" | "error">("idle");
  const shownArtists = artists.join(", ");

  if (!canRename)
    return (
      <VStack gap={1}>
        <Heading level={1}>{title}</Heading>
        {artists.length > 0 && <Text color="secondary">{shownArtists}</Text>}
      </VStack>
    );

  const keys = (event: KeyboardEvent<HTMLSpanElement>, before: string) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.currentTarget.textContent = before;
      event.currentTarget.blur();
    }
  };
  const save = async (
    nextTitle: string,
    nextArtists: string[],
    field: HTMLElement,
    before: string,
  ) => {
    if (nextTitle === title && nextArtists.join(", ") === shownArtists) {
      field.textContent = before;
      return;
    }
    setState("saving");
    const result = await renameSong(versionId, nextTitle, nextArtists);
    if (result === "saved") {
      setState("idle");
      onRenamed(nextTitle.trim(), nextArtists);
    } else {
      field.textContent = before;
      setState(result);
    }
  };
  const editable = {
    className: "cd-inline-edit",
    role: "textbox",
    contentEditable: state !== "saving",
    suppressContentEditableWarning: true,
    spellCheck: false,
  } as const;

  return (
    <VStack gap={1}>
      <Heading level={1}>
        <span
          // A new name remounts it, since typing replaced the text React put there.
          key={title}
          {...editable}
          aria-label={t("title", { title })}
          onKeyDown={(event) => keys(event, title)}
          onBlur={(event) =>
            void save(
              (event.currentTarget.textContent ?? "").trim(),
              artists,
              event.currentTarget,
              title,
            )
          }
        >
          {title}
        </span>
      </Heading>
      <Text color="secondary">
        <span
          key={shownArtists}
          {...editable}
          aria-label={t("artists", { artists: shownArtists })}
          data-placeholder={t("noArtists")}
          onKeyDown={(event) => keys(event, shownArtists)}
          onBlur={(event) =>
            void save(
              title,
              splitArtists(event.currentTarget.textContent ?? ""),
              event.currentTarget,
              shownArtists,
            )
          }
        >
          {shownArtists}
        </span>
      </Text>
      {(state === "invalid" || state === "refused" || state === "error") && (
        <Text type="supporting" role="alert">
          {t(`errors.${state}`)}
        </Text>
      )}
    </VStack>
  );
}
