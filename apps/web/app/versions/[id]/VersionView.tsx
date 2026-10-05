import { keyName, type Chart } from "@chartdown/core";
import { Button } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { forkVersion } from "./actions";
import { ChartBody } from "./ChartBody";
import { DisplayBar } from "./DisplayBar";
import type { Display } from "./display";
import type { BasedOn } from "./load";
import styles from "./version.module.css";

export interface VersionSource {
  type: "studio" | "live" | "acoustic" | "own_arrangement";
  album: string | null;
  year: number | null;
  youtube: string | null;
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
  /** The last fork attempt failed. */
  forkFailed?: boolean;
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
  display,
  path,
  notice,
}: VersionViewProps) {
  const t = useTranslations("version");
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
          {(visibility === "private" || status === "frozen") && (
            <p>
              <span className={styles.badge}>
                {visibility === "private" ? t("private") : t("frozen")}
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
      {display && path && <DisplayBar path={path} chart={chart} display={display} />}
      <ChartBody
        chart={chart}
        style={display?.style ?? "numbers"}
        homeKey={display?.key ?? chart.key}
      />
    </main>
  );
}
