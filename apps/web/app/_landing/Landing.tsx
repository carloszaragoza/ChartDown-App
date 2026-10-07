import { chordFormatter, keyName, parse, sectionLength } from "chartdown";
import { ChartDownLogo, Icon } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useChartLabels } from "../_components/chartLabels";
import { LanguageSwitcher } from "../_components/LanguageSwitcher";
import { joinWaitlist } from "./actions";
import { EXAMPLE_CHART, LANGUAGE_URL, NOTE_BARS } from "./example";
import { LandingChart, type SheetBar, type SheetNote } from "./LandingChart";
import styles from "./landing.module.css";

// "Built for the stage": four facts, each an ink callout on the stand-mode frame.
const STAGE = ["offline", "stand", "part", "saved"] as const;
// The section strip pinned to the top of stand mode, as the app draws it.
const STRIP = ["I", "V1", "C", "V2", "B"] as const;

export type WaitlistResult = "sent" | "invalid" | "unavailable";

export interface LandingProps {
  /** Whether sign-in is open here: Sign in and "I have an invite code" (R-01.7). */
  signInEnabled: boolean;
  /** Whether the waitlist form can be used here (R-01.8). */
  waitlistReady: boolean;
  /** How the last waitlist request went. */
  result?: WaitlistResult | null;
  /** The person just deleted their account (R-01.6). */
  accountDeleted?: boolean;
}

/**
 * The landing page at chartdown.app (T-1307, Design Handoff 2.0: the red-pen chart sheet): the
 * page is one Nashville Number chart on a music stand. An original chorus drawn by the parser,
 * the music director's notes for each player, the open language, and the invite-only beta's
 * waitlist on the stand's ledge.
 */
export function Landing({
  signInEnabled,
  waitlistReady,
  result = null,
  accountDeleted = false,
}: LandingProps) {
  const t = useTranslations("landing");
  const account = useTranslations("auth.account");
  const labels = useChartLabels();
  const chart = parse(EXAMPLE_CHART);
  const section = chart.sections[0];
  const formatter = chordFormatter(chart, { style: "numbers" });
  const row = section?.rows[0];
  const bars: SheetBar[] = (row?.bars ?? []).map((bar) => ({
    dynamic: bar.dynamic ?? null,
    chords: bar.items.flatMap((item) => {
      if (item.type !== "chord" || !row) return [];
      const { root, quality, bass } = formatter.chord(item, row);
      return [{ root, quality: quality ?? "", bass: bass ?? "" }];
    }),
  }));
  const notes: SheetNote[] = (section?.notes ?? []).map((note) => {
    const role = note.roles.find((item) => item !== "everyone");
    return {
      for: role ?? "everyone",
      label: role ? labels.bar.instrument(role) : "MD",
      text: note.text,
      bar: role ? (NOTE_BARS[role] ?? 1) : 1,
    };
  });
  const views = [
    { id: "everyone", label: t("hero.everyone") },
    ...(["keys", "bass", "drums"] as const).map((id) => ({
      id,
      label: labels.bar.instrument(id),
    })),
  ];
  const steps = ["write", "set", "play"] as const;
  const waitlist =
    result === "sent" ? (
      <p role="status" className={styles.ledgeText}>
        {t("invite.sent")}
      </p>
    ) : waitlistReady ? (
      <form action={joinWaitlist} className={styles.waitlist}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("invite.email")}</span>
          <input
            className={styles.input}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("invite.placeholder")}
            required
          />
        </label>
        <button type="submit" className={styles.primary}>
          {t("invite.submit")}
        </button>
      </form>
    ) : null;

  return (
    // A printed sheet in both color schemes: the landing pins the light tokens (handoff 2.0).
    <div className={styles.landing} data-theme="light">
      <header className={styles.top}>
        <Link href="/" className={styles.brand} aria-label="ChartDown">
          <ChartDownLogo size={34} />
        </Link>
        <nav aria-label={t("nav")} className={styles.nav}>
          <a href="#how" className={styles.navLink}>
            {t("how.title")}
          </a>
          <a href="#language" className={styles.navLink}>
            {t("language.nav")}
          </a>
          {signInEnabled && (
            <Link href="/catalog" className={styles.navLink}>
              {t("catalog")}
            </Link>
          )}
        </nav>
        <div className={styles.end}>
          <LanguageSwitcher />
          {signInEnabled && (
            <Link href="/auth/sign-in" className={styles.secondary}>
              {t("signIn")}
            </Link>
          )}
          <a href="#invite" className={styles.primary}>
            {t("requestInvite")}
          </a>
        </div>
      </header>

      <main className={styles.main}>
        {accountDeleted && (
          <p role="status" className={styles.notice}>
            {account("accountDeleted")}
          </p>
        )}

        <section className={styles.sheet} aria-labelledby="hero-title">
          <div className={styles.titleLine}>
            <h1 id="hero-title" className={styles.headline}>
              {t("hero.title")}
            </h1>
            <p className={styles.chartMeta}>
              {t("hero.meta", {
                title: chart.header.title ?? "",
                key: keyName(chart.key),
                tempo: chart.header.tempo ?? "",
                meter: chart.header.meter ?? "4/4",
              })}
            </p>
          </div>
          <p className={styles.lead}>{t("hero.lead")}</p>
          {section && (
            <LandingChart
              section={section.name}
              length={labels.length(sectionLength(section))}
              bars={bars}
              notes={notes}
              views={views}
              words={{
                viewAs: t("hero.viewAs"),
                // A text, not a function, so it can travel to the client: it fills {instrument}.
                viewing: t("hero.viewing", { instrument: "{instrument}" }),
                example: t("hero.example"),
                bar: t("hero.bar", { bar: "{bar}" }),
              }}
            />
          )}
        </section>

        {/* The stand's ledge: where the pencil rests, and where the visitor leaves an email. */}
        <section id="invite" className={styles.ledge} aria-labelledby="invite-title">
          <div className={styles.ledgeInner}>
            <div className={styles.ledgeCopy}>
              <h2 id="invite-title" className={styles.ledgeTitle}>
                {t("invite.title")}
              </h2>
              <p className={styles.ledgeText}>
                {t("invite.text")} {t("hero.free")}
              </p>
            </div>
            <div className={styles.ledgeAction}>
              {waitlist}
              {(result === "invalid" || result === "unavailable" || !waitlistReady) &&
                result !== "sent" && (
                  <p role="alert" className={styles.ledgeText}>
                    {result === "invalid" ? t("invite.invalid") : t("invite.unavailable")}
                  </p>
                )}
              {signInEnabled && (
                <Link href="/auth/sign-up" className={styles.ledgeLink}>
                  {t("invite.haveCode")}
                </Link>
              )}
            </div>
          </div>
        </section>

        <section id="how" className={styles.block} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.blockTitle}>
            {t("how.title")}
          </h2>
          {/* Three steps read like a set list: a number, a title, a line of text, one rule each. */}
          <ol className={styles.setList}>
            {steps.map((step, index) => (
              <li key={step} className={styles.setItem}>
                <span className={styles.setNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.setTitle}>{t(`how.${step}.title`)}</h3>
                <p className={styles.text}>{t(`how.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.block} aria-labelledby="stage-title">
          <h2 id="stage-title" className={styles.blockTitle}>
            {t("stage.title")}
          </h2>
          <div className={styles.stage}>
            {/* Stand mode, drawn in ink: each numbered mark points at one of the facts beside it. */}
            <figure className={styles.standFrame} aria-label={t("stage.frame")}>
              <div className={styles.standTop} aria-hidden="true">
                <span className={styles.standStrip}>
                  {STRIP.map((label) => (
                    <span
                      key={label}
                      className={styles.standTab}
                      data-current={label === "C" || undefined}
                    >
                      {label}
                    </span>
                  ))}
                </span>
                <span className={styles.standStatus}>
                  <Icon name="history" />
                  <span className={styles.callout}>4</span>
                  <Icon name="download" />
                  <span className={styles.callout}>1</span>
                </span>
              </div>
              <div className={styles.standBars} aria-hidden="true">
                <span className={styles.callout}>2</span>
                {bars.map((bar, index) => (
                  <span key={index} className={styles.standBar}>
                    {bar.chords.map((chord) => `${chord.root}${chord.quality}`).join(" ")}
                  </span>
                ))}
              </div>
              <p className={styles.standNote} aria-hidden="true">
                <span className={styles.callout}>3</span>
                <span className={styles.noteTag}>{labels.bar.instrument("drums")}</span>{" "}
                {notes.find((note) => note.for === "drums")?.text}
              </p>
            </figure>
            <ol className={styles.callouts}>
              {STAGE.map((key, index) => (
                <li key={key} className={styles.calloutItem}>
                  <span className={styles.callout} aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className={styles.setTitle}>{t(`stage.${key}.title`)}</h3>
                  <p className={styles.text}>{t(`stage.${key}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="language" className={styles.language} aria-labelledby="language-title">
          <div className={styles.languageCopy}>
            <h2 id="language-title" className={styles.blockTitle}>
              {t("language.title")}
            </h2>
            <p className={styles.text}>{t("language.text")}</p>
            <a href={LANGUAGE_URL} className={styles.secondary}>
              {t("language.spec")}
            </a>
          </div>
          <pre className={styles.code} aria-label={t("language.example")}>
            {EXAMPLE_CHART}
          </pre>
        </section>

        <section className={styles.ending} aria-labelledby="ending-title">
          <svg className={styles.fermata} viewBox="0 0 64 36" aria-hidden="true">
            <path d="M4 32C6 12 20 4 32 4s26 8 28 28" />
            <circle cx="32" cy="27" r="4" />
          </svg>
          <h2 id="ending-title" className={styles.endingTitle}>
            {t("ending.title")}
          </h2>
          <a href="#invite" className={styles.primary}>
            {t("requestInvite")}
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>{t("footer.copyright")}</span>
          <a href={LANGUAGE_URL} className={styles.footerLink}>
            {t("footer.language")}
          </a>
          <Link href="/terms" className={styles.footerLink}>
            {t("footer.terms")}
          </Link>
          <Link href="/privacy" className={styles.footerLink}>
            {t("footer.privacy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
