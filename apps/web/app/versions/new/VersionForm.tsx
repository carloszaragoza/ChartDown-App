"use client";

import { Button } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { SOURCE_TYPES } from "../../../lib/versions/validate";
import { createVersion, type VersionFormState } from "./actions";
import styles from "./new.module.css";

// A place to start: two sections the person replaces with their own chart.
const STARTER = "## Verse\n1 | 4 | 6m | 5\n\n## Chorus\n4 | 1 | 5 | 1\n";

export interface VersionFormProps {
  /** The existing song, or null for a new one. */
  song: { id: string; title: string; artists: string[] } | null;
  defaultTitle: string;
  defaultAuthor: string;
}

/** The chart, its author and its source (R-02.1, R-02.2). Always published as public (R-02.3). */
export function VersionForm({ song, defaultTitle, defaultAuthor }: VersionFormProps) {
  const t = useTranslations("newVersion");
  const sources = useTranslations("version.source");
  const [state, action, pending] = useActionState<VersionFormState, FormData>(createVersion, {
    error: null,
    values: null,
  });
  const values = state.values;
  const sourceRef = useRef<HTMLFieldSetElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  // A missing source moves focus to the choice; any other error to the message.
  useEffect(() => {
    if (state.error === "source_required") sourceRef.current?.focus();
    else if (state.error) alertRef.current?.focus();
  }, [state]);

  return (
    <form action={action} className={styles.form} noValidate>
      {state.error && (
        <p role="alert" ref={alertRef} tabIndex={-1} className={styles.alert} id="version-error">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {song ? (
        <div className={styles.field}>
          <input type="hidden" name="songId" value={song.id} />
          <span>{t("song")}</span>
          <span className={styles.songTitle}>
            {song.title}
            {song.artists.length > 0 && (
              <span className={styles.hint}> · {song.artists.join(", ")}</span>
            )}
          </span>
        </div>
      ) : (
        <>
          <label className={styles.field}>
            {t("songTitle")}
            <input
              className={styles.input}
              name="title"
              required
              maxLength={200}
              defaultValue={values?.title ?? defaultTitle}
              aria-invalid={state.error === "title_required" || undefined}
            />
          </label>
          <label className={styles.field}>
            {t("artists")}
            <input
              className={styles.input}
              name="artists"
              defaultValue={values?.artists ?? ""}
              aria-describedby="artists-hint"
            />
            <span id="artists-hint" className={styles.hint}>
              {t("artistsHint")}
            </span>
          </label>
        </>
      )}

      <label className={styles.field}>
        {t("chart")}
        <textarea
          className={styles.chart}
          name="content"
          required
          rows={14}
          spellCheck={false}
          defaultValue={values?.content ?? STARTER}
          aria-invalid={state.error === "chart_required" || undefined}
        />
      </label>

      <label className={styles.field}>
        {t("author")}
        <input
          className={styles.input}
          name="author"
          required
          maxLength={80}
          defaultValue={values?.author ?? defaultAuthor}
          aria-invalid={state.error === "author_required" || undefined}
        />
      </label>

      <fieldset
        ref={sourceRef}
        tabIndex={-1}
        className={styles.group}
        aria-invalid={state.error === "source_required" || undefined}
        aria-describedby={state.error === "source_required" ? "version-error" : undefined}
      >
        <legend className={styles.legend}>{t("source")}</legend>
        <p className={styles.hint}>{t("sourceHint")}</p>
        <div className={styles.choices}>
          {SOURCE_TYPES.map((type) => (
            <label key={type} className={styles.choice}>
              <input
                type="radio"
                name="sourceType"
                value={type}
                defaultChecked={values?.sourceType === type}
              />
              {sources(type)}
            </label>
          ))}
        </div>
        <label className={styles.field}>
          {t("album")}
          <input
            className={styles.input}
            name="album"
            maxLength={200}
            defaultValue={values?.album ?? ""}
          />
        </label>
        <label className={styles.field}>
          {t("year")}
          <input
            className={styles.input}
            name="year"
            inputMode="numeric"
            defaultValue={values?.year ?? ""}
            aria-invalid={state.error === "year_invalid" || undefined}
          />
        </label>
        <label className={styles.field}>
          {t("youtube")}
          <input
            className={styles.input}
            name="youtube"
            type="url"
            defaultValue={values?.youtube ?? ""}
            aria-invalid={state.error === "youtube_invalid" || undefined}
          />
        </label>
      </fieldset>

      <p className={styles.notice}>{t("cc0")}</p>
      <Button
        type="submit"
        variant="primary"
        {...(pending ? { disabledReason: t("publishing") } : {})}
      >
        {t("publish")}
      </Button>
    </form>
  );
}
