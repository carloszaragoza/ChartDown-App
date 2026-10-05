import { chordFormatter, keyName, type Chart } from "@chartdown/core";
import { Button, FormStrip, formStripItems, Section, type FormStripItem } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useChartLabels } from "../../_components/chartLabels";
import { forkVersion } from "./actions";
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
  /** The last fork attempt failed. */
  forkFailed?: boolean;
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
  forkFailed = false,
  notice,
}: VersionViewProps) {
  const t = useTranslations("version");
  const c = useTranslations("chart");
  const labels = useChartLabels();
  const formatter = chordFormatter(chart, { style: "numbers" });
  const describe = (item: FormStripItem) => `${item.name}, ${labels.length(item.length)}`;
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
            {c("key")} <b>{keyName(chart.key)}</b> · {c("time")}{" "}
            <b>{chart.header.meter ?? "4/4"}</b>
            {chart.header.tempo && (
              <>
                {" · "}
                {c("tempo")} <b>{chart.header.tempo}</b>
              </>
            )}
          </p>
        </div>
        {owner && (
          <Link href={`/versions/${id}/history`} className="cd-button cd-button--secondary">
            {t("history")}
          </Link>
        )}
        {signedIn && !owner && notice === undefined && (
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
      <FormStrip
        items={formStripItems(chart, -1, () => false)}
        labels={{ nav: c("songForm"), describe }}
      />
      {chart.sections.map((section, index) => (
        <Section
          key={index}
          section={section}
          formatter={formatter}
          labels={labels}
          size="md"
          id={`section-${index + 1}`}
        />
      ))}
    </main>
  );
}
