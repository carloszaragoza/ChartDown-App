"use client";

import { keyName, parse, type Chart } from "@chartdown/core";
import { InstrumentTag } from "@chartdown/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { READER, storedSet, storedSets, type SetBundle } from "../../../../lib/offline/store";
import { setSongKey } from "../../../../lib/sets/lineup";
import { songView, type SetSong } from "../../../../lib/sets/song";
import { setWhen } from "../../../../lib/sets/when";
import { ChartBody } from "../../../versions/[id]/ChartBody";
import { readDisplay } from "../../../versions/[id]/display";
import { readSection } from "../../../versions/[id]/stand/standHref";
import { StandMode } from "../../../versions/[id]/stand/StandMode";
import styles from "../../../sets/sets.module.css";

const noChanges = () => () => {};

type Place =
  | { kind: "list" }
  | { kind: "set"; setId: string }
  | { kind: "song"; setId: string; position: number; stand: boolean };

/** Where the reader is, from its address: /offline/set[/<set>[/<song>[/stand]]]. */
export function readPlace(pathname: string): Place {
  const [setId, song, stand] = pathname.slice(READER.length).split("/").filter(Boolean);
  if (!setId) return { kind: "list" };
  const position = Number(song);
  if (!Number.isInteger(position) || position < 1) return { kind: "set", setId };
  return { kind: "song", setId, position, stand: stand === "stand" };
}

/** The notes of a song as its person sees them, placed against the charts they were anchored to. */
function songNotes(song: SetSong, bundle: SetBundle) {
  const chart = parse(song.content);
  const anchored = (revisionId: string): Chart | undefined => {
    const content = bundle.anchored[revisionId];
    return content === undefined ? undefined : parse(content);
  };
  return { chart, view: songView(chart, song, anchored) };
}

/**
 * The offline reader (R-08.2, R-08.4): the downloaded sets, a set's songs, a song with the
 * person's notes, and stand mode, all from the device and read-only.
 */
export function OfflineReader() {
  const t = useTranslations("offline");
  const s = useTranslations("sets");
  const c = useTranslations("chart");
  const format = useFormatter();
  // Drawn only in the browser: the address and the stored sets are only known there.
  const pathname = useSyncExternalStore(
    noChanges,
    () => window.location.pathname,
    () => null,
  );
  const place = useMemo(() => (pathname === null ? null : readPlace(pathname)), [pathname]);
  const [bundle, setBundle] = useState<SetBundle | null | undefined>(undefined);
  const [all, setAll] = useState<SetBundle[]>([]);

  useEffect(() => {
    if (!place) return;
    if (place.kind === "list") void storedSets().then(setAll);
    else void storedSet(place.setId).then(setBundle);
  }, [place]);

  if (!place) return null;
  const banner = (
    <p className={styles.hint} role="note">
      {t("readOnly")}
    </p>
  );

  if (place.kind === "list") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>{t("listTitle")}</h1>
        {banner}
        {all.length === 0 ? (
          <p className={styles.hint}>{t("noneDownloaded")}</p>
        ) : (
          <ul className={styles.items}>
            {all.map((item) => (
              <li key={item.set.id} className={styles.row}>
                <a href={`${READER}/${item.set.id}`} className={styles.link}>
                  {item.set.name}
                </a>
                <span className={styles.hint}>
                  {item.set.personal ? s("mySets") : item.set.band} ·{" "}
                  {setWhen(format, item.set.date, item.set.time) ?? s("noDate")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  if (bundle === undefined) return null;
  if (!bundle) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>{t("notDownloadedTitle")}</h1>
        <p className={styles.hint}>{t("notDownloaded")}</p>
        <a href={READER} className={styles.link}>
          {t("allDownloaded")}
        </a>
      </main>
    );
  }

  const base = `${READER}/${bundle.set.id}`;
  const total = bundle.songs.length;

  if (place.kind === "set") {
    return (
      <main className={styles.wide}>
        <div>
          <p className={styles.hint}>
            {bundle.set.personal ? s("mySets") : bundle.set.band} · {s(`types.${bundle.set.type}`)}
          </p>
          <h1 className={styles.title}>{bundle.set.name}</h1>
          <p className={styles.meta}>
            {[
              setWhen(format, bundle.set.date, bundle.set.time, "full"),
              s("songs", { count: total }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {banner}
        <div className={styles.columns}>
          <section aria-labelledby="songs" className={styles.card}>
            <h2 id="songs" className={styles.cardTitle}>
              {s("songsTitle")}
            </h2>
            <ol className={styles.songList}>
              {bundle.songs.map((song) => {
                const { chart, view } = songNotes(song, bundle);
                return (
                  <li key={song.position} className={styles.songRow}>
                    <span className={styles.position}>{song.position}</span>
                    <a href={`${base}/${song.position}`} className={styles.songTitle}>
                      {song.title}
                    </a>
                    <span className={styles.songKey}>
                      {s("key")} <b>{keyName(setSongKey(chart, song.set_key))}</b>
                    </span>
                    <span className={view.forYou > 0 ? styles.forYou : styles.noNotes}>
                      {view.forYou > 0
                        ? song.role === "musician"
                          ? s("forYouCount", { count: view.forYou })
                          : s("notesCount", { count: view.forYou })
                        : s("noNotes")}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
          <section aria-labelledby="lineup" className={styles.card}>
            <h2 id="lineup" className={styles.cardTitle}>
              {s("lineup")}
            </h2>
            <ul className={styles.lineupList}>
              {bundle.lineup.map((member, index) => (
                <li key={index} className={styles.lineupRow}>
                  <span className={styles.lineupIcon}>
                    {member.instruments[0] && (
                      <InstrumentTag
                        instrument={member.instruments[0]}
                        label={member.instruments[0]}
                        variant="compact"
                      />
                    )}
                  </span>
                  <span className={styles.songText}>
                    <b>{member.name}</b>
                    <span className={styles.hint}>
                      {member.instruments.length > 0 ? member.instruments.join(", ") : s("sitsOut")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    );
  }

  const song = bundle.songs.find((item) => item.position === place.position);
  if (!song) return null;
  const { chart, view } = songNotes(song, bundle);
  const homeKey = setSongKey(chart, song.set_key);
  const notes = view.sections.map((section) =>
    section.map((note) => ({
      md: note.md,
      roles: note.roles,
      text: note.bar ? `${s("bar", { bar: note.bar })} · ${note.text}` : note.text,
    })),
  );
  const search = new URLSearchParams(window.location.search);

  if (place.stand) {
    const display = readDisplay(chart, { view: search.get("view") ?? undefined });
    return (
      <StandMode
        versionId={song.version_id}
        title={song.title}
        content={song.content}
        section={readSection(chart, search.get("s") ?? undefined)}
        style={display.style}
        homeKey={homeKey}
        theme={search.get("theme") === "stage" ? "stage" : "light"}
        path={`${base}/${song.position}/stand`}
        notes={notes}
        forYou={view.sections.map((section) => section.some((note) => note.forYou))}
        set={{
          href: base,
          name: bundle.set.name,
          songOf: s("songOf", { position: song.position, total }),
          ...(song.position > 1
            ? { previousSong: `${base}/${song.position - 1}/stand?s=999` }
            : {}),
          ...(song.position < total ? { nextSong: `${base}/${song.position + 1}/stand` } : {}),
        }}
      />
    );
  }

  return (
    <main className={styles.wide}>
      <p className={styles.hint}>
        <a href={base} className={styles.link}>
          {bundle.set.name}
        </a>{" "}
        · {s("songOf", { position: song.position, total })}
      </p>
      <div>
        <h1 className={styles.title}>{song.title}</h1>
        <p className={styles.hint}>
          {c("key")} <b>{keyName(homeKey)}</b>
          {keyName(homeKey) !== keyName(chart.key) && (
            <> {c("writtenIn", { key: keyName(chart.key) })}</>
          )}
        </p>
        <p className={styles.hint}>
          {song.role === "musician" ? s("notesForYou", { count: view.forYou }) : s("allNotesMd")}
        </p>
      </div>
      {banner}
      <div className={styles.buttons}>
        <a href={`${base}/${song.position}/stand`} className="cd-button cd-button--primary">
          {s("startStand")}
        </a>
      </div>
      <ChartBody chart={chart} homeKey={homeKey} notes={(index) => notes[index] ?? []} />
      <nav aria-label={s("songs", { count: total })} className={styles.turn}>
        {song.position > 1 ? (
          <a href={`${base}/${song.position - 1}`} className={styles.link}>
            {s("previousSong")}
          </a>
        ) : (
          <span />
        )}
        {song.position < total ? (
          <a href={`${base}/${song.position + 1}`} className={styles.link}>
            {s("nextSong")}
          </a>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
