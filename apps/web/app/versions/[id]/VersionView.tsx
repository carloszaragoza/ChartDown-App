import { keyName, type Chart } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { addToSet } from "../../sets/actions";
import { forkVersion, reportVersion } from "./actions";
import { ChartBody } from "./ChartBody";
import { DisplayBar } from "./DisplayBar";
import { displayHref, type Display } from "./display";
import type { BasedOn } from "./load";
import styles from "./version.module.css";

export interface VersionSource {
  type: "studio" | "live" | "acoustic" | "own_arrangement";
  album: string | null;
  year: number | null;
  youtube: string | null;
}

/** A set this person may add the version to; band null means their personal space. */
export interface SetChoice {
  id: string;
  band: string | null;
  name: string;
}

export interface VersionViewProps {
  id: string;
  title: string;
  artists: string[];
  author: string;
  source: VersionSource;
  chart: Chart;
  signedIn: boolean;
  /** The signed-in person owns this version: they find its history (R-02.8). */
  owner?: boolean;
  /** For a fork, the version it is based on (R-02.7). */
  basedOn?: BasedOn | null;
  /** A private version, or a public one frozen when its owner made it private (R-02.4). */
  visibility?: "public" | "private";
  status?: "active" | "frozen" | "hidden";
  /** The sets of the bands where this person is the MD (R-05.2). */
  setChoices?: SetChoice[];
  setFailed?: boolean;
  /** The last fork attempt failed. */
  forkFailed?: boolean;
  /** How the person's report went (R-07.2). */
  report?: "sent" | "already" | "failed" | null;
  /** Numbers or letters and the key to show (R-03.2); numbers in the written key by default. */
  display?: Display;
  /** The page's own address, for the display choices. */
  path?: string;
  /** Shown above the chart, e.g. when reading an earlier revision. */
  notice?: ReactNode;
}

/** A version as everyone reads it: its chart in the written key, with no band's layer (R-06.5). */
export function VersionView({
  id,
  title,
  artists,
  author,
  source,
  chart,
  signedIn,
  owner = false,
  basedOn = null,
  visibility = "public",
  status = "active",
  forkFailed = false,
  report = null,
  setChoices = [],
  setFailed = false,
  display,
  path,
  notice,
}: VersionViewProps) {
  const t = useTranslations("version");
  const s = useTranslations("sets");
  const c = useTranslations("chart");
  const facts = [
    t(`source.${source.type}`),
    source.album && t("album", { album: source.album }),
    source.year && String(source.year),
  ].filter(Boolean);

  return (
    <main className={styles.page}>
      {notice}
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {(visibility === "private" || status !== "active") && (
            <p>
              <span className={styles.badge}>
                {status === "hidden"
                  ? t("hidden")
                  : visibility === "private"
                    ? t("private")
                    : t("frozen")}
              </span>
            </p>
          )}
          {artists.length > 0 && <p className={styles.meta}>{artists.join(", ")}</p>}
          <p className={styles.meta}>
            {t("by", { author })} · {facts.join(" · ")}
            {source.youtube && (
              <>
                {" · "}
                <a
                  href={source.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {t("youtube")}
                </a>
              </>
            )}
          </p>
          {basedOn && (
            <p className={styles.meta}>
              {basedOn === "unknown" ? (
                t("basedOnUnknown")
              ) : (
                <Link href={`/versions/${basedOn.id}`} className={styles.link}>
                  {t("basedOn", { author: basedOn.author })}
                </Link>
              )}
            </p>
          )}
          <p className={styles.meta}>
            {c("key")} <b>{keyName(display?.key ?? chart.key)}</b>
            {display && keyName(display.key) !== keyName(chart.key) && (
              <> {c("writtenIn", { key: keyName(chart.key) })}</>
            )}{" "}
            · {c("time")} <b>{chart.header.meter ?? "4/4"}</b>
            {chart.header.tempo && (
              <>
                {" · "}
                {c("tempo")} <b>{chart.header.tempo}</b>
              </>
            )}
          </p>
        </div>
        {owner && (
          <div className={styles.actions}>
            {status === "active" && (
              <Link href={`/versions/${id}/edit`} className="cd-button cd-button--primary">
                {t("edit")}
              </Link>
            )}
            <Link href={`/versions/${id}/history`} className="cd-button cd-button--secondary">
              {t("history")}
            </Link>
            {visibility === "public" && status === "active" && (
              <Link
                href={`/versions/${id}/make-private`}
                className="cd-button cd-button--secondary"
              >
                {t("makePrivate")}
              </Link>
            )}
          </div>
        )}
        {signedIn && notice === undefined && (
          <Link href={`/versions/${id}/notes`} className="cd-button cd-button--secondary">
            {t("myNotes")}
          </Link>
        )}
        {setChoices.length > 0 && notice === undefined && (
          <form action={addToSet} className={styles.addToSet}>
            <input type="hidden" name="versionId" value={id} />
            <label className={styles.keyLabel}>
              {s("addTo")}
              <select name="setId" required defaultValue="" className={styles.select}>
                <option value="" disabled>
                  {s("chooseSet")}
                </option>
                {setChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.band
                      ? `${choice.band} · ${choice.name}`
                      : `${s("mySets")} · ${choice.name}`}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">{s("addButton")}</Button>
            {setFailed && (
              <p role="alert" className={styles.alert}>
                {s("addFailed")}
              </p>
            )}
          </form>
        )}
        {signedIn && !owner && visibility === "public" && notice === undefined && (
          <form action={forkVersion} className={styles.fork}>
            <input type="hidden" name="versionId" value={id} />
            <Button type="submit">{t("fork")}</Button>
            <p className={styles.hint}>{t("forkCc0")}</p>
            {forkFailed && (
              <p role="alert" className={styles.alert}>
                {t("forkFailed")}
              </p>
            )}
          </form>
        )}
        {signedIn &&
          !owner &&
          visibility === "public" &&
          status !== "hidden" &&
          notice === undefined && (
            <details className={styles.fork} open={report !== null}>
              <summary className="cd-button cd-button--secondary">{t("report.open")}</summary>
              {report === "sent" || report === "already" ? (
                <p role="status" className={styles.hint}>
                  {t(`report.${report}`)}
                </p>
              ) : (
                <form action={reportVersion} className={styles.fork}>
                  <input type="hidden" name="versionId" value={id} />
                  <label className={styles.hint}>
                    {t("report.reason")}
                    <select name="reason" className={styles.select} defaultValue="lyrics">
                      <option value="lyrics">{t("report.reasons.lyrics")}</option>
                      <option value="other">{t("report.reasons.other")}</option>
                    </select>
                  </label>
                  <label className={styles.hint}>
                    {t("report.note")}
                    <textarea name="note" className={styles.select} maxLength={500} rows={3} />
                  </label>
                  <Button type="submit">{t("report.submit")}</Button>
                  {report === "failed" && (
                    <p role="alert" className={styles.alert}>
                      {t("report.failed")}
                    </p>
                  )}
                </form>
              )}
            </details>
          )}
        {!signedIn && (
          <div className={styles.fork}>
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(`/versions/${id}`)}`}
              className="cd-button cd-button--secondary"
            >
              {t("fork")}
            </Link>
            <p className={styles.hint}>{t("forkHint")}</p>
          </div>
        )}
      </header>
      {display && path && (
        <div className={styles.viewing}>
          <DisplayBar path={path} chart={chart} display={display} />
          {notice === undefined && (
            <Link
              href={`/versions/${id}/stand${displayHref("", display, chart)}`}
              className="cd-button cd-button--primary"
            >
              {t("stand")}
            </Link>
          )}
        </div>
      )}
      <ChartBody
        chart={chart}
        style={display?.style ?? "numbers"}
        homeKey={display?.key ?? chart.key}
      />
    </main>
  );
}
