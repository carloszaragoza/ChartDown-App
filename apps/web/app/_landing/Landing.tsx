import { chordFormatter, parse } from "chartdown";
import { Button, Icon, Section, type IconName } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useChartLabels } from "../_components/chartLabels";
import { LanguageSwitcher } from "../_components/LanguageSwitcher";
import { joinWaitlist } from "./actions";
import { EXAMPLE_CHART, LANGUAGE_URL } from "./example";
import styles from "./landing.module.css";

// "Built for the stage": the design's four cards, with its icons.
const CARDS: readonly { key: "offline" | "stand" | "part" | "saved"; icon: IconName }[] = [
  { key: "offline", icon: "download" },
  { key: "stand", icon: "atril" },
  { key: "part", icon: "view-as" },
  { key: "saved", icon: "history" },
];

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
 * The landing page at chartdown.app (T-1201, design/screens/07-landing.html): what ChartDown App
 * is, the open language, and the invite-only beta's waitlist.
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
  const steps = ["write", "set", "play"] as const;

  return (
    <div className={styles.landing}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand}>
          ChartDown
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
            <Link href="/auth/sign-in" className="cd-button cd-button--secondary">
              {t("signIn")}
            </Link>
          )}
          <a href="#invite" className="cd-button cd-button--primary">
            {t("requestInvite")}
          </a>
        </div>
      </header>

      <main className={styles.main}>
        {accountDeleted && (
          <p role="status" className={styles.lead}>
            {account("accountDeleted")}
          </p>
        )}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.pitch}>
            <h1 id="hero-title" className={styles.headline}>
              {t("hero.title")}
            </h1>
            <p className={styles.lead}>{t("hero.lead")}</p>
            <div className={styles.actions}>
              <a href="#invite" className="cd-button cd-button--primary">
                {t("requestInvite")}
              </a>
              <a href="#language" className="cd-button cd-button--secondary">
                {t("hero.try")}
              </a>
            </div>
            <span className={styles.meta}>{t("hero.free")}</span>
          </div>
          <figure className={styles.example} aria-label={t("hero.example")}>
            <span className={styles.viewing}>
              <Icon name="view-as" size={20} />
              {t("hero.viewing", { instrument: labels.bar.instrument("drums") })}
            </span>
            {section && (
              <Section
                section={section}
                formatter={chordFormatter(chart, { style: "numbers" })}
                labels={labels}
                size="md"
              />
            )}
          </figure>
        </section>

        <section id="how" className={styles.block} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.heading}>
            {t("how.title")}
          </h2>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step} className={styles.step}>
                <span className={styles.number} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.stepTitle}>{t(`how.${step}.title`)}</h3>
                <p className={styles.text}>{t(`how.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.block} aria-labelledby="stage-title">
          <h2 id="stage-title" className={styles.heading}>
            {t("stage.title")}
          </h2>
          <ul className={styles.cards}>
            {CARDS.map(({ key, icon }) => (
              <li key={key} className={styles.card}>
                <Icon name={icon} />
                <h3 className={styles.stepTitle}>{t(`stage.${key}.title`)}</h3>
                <p className={styles.text}>{t(`stage.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="language"
          className={`${styles.card} ${styles.language}`}
          aria-labelledby="language-title"
        >
          <div className={styles.pitch}>
            <h2 id="language-title" className={styles.heading}>
              {t("language.title")}
            </h2>
            <p className={styles.lead}>{t("language.text")}</p>
            <div>
              <a href={LANGUAGE_URL} className="cd-button cd-button--secondary">
                {t("language.spec")}
              </a>
            </div>
          </div>
          <pre className={styles.code} aria-label={t("language.example")}>
            {EXAMPLE_CHART}
          </pre>
        </section>

        <section id="invite" className={styles.block} aria-labelledby="invite-title">
          <h2 id="invite-title" className={styles.heading}>
            {t("invite.title")}
          </h2>
          <p className={styles.lead}>{t("invite.text")}</p>
          {result === "sent" ? (
            <p role="status" className={styles.text}>
              {t("invite.sent")}
            </p>
          ) : waitlistReady ? (
            <form action={joinWaitlist} className={styles.waitlist}>
              <label className={styles.field}>
                {t("invite.email")}
                <input
                  className={styles.input}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("invite.placeholder")}
                  required
                />
              </label>
              <Button type="submit" variant="primary">
                {t("invite.submit")}
              </Button>
            </form>
          ) : null}
          {(result === "invalid" || result === "unavailable" || !waitlistReady) &&
            result !== "sent" && (
              <p role="alert" className={styles.text}>
                {result === "invalid" ? t("invite.invalid") : t("invite.unavailable")}
              </p>
            )}
          {signInEnabled && (
            <Link href="/auth/sign-up" className={styles.link}>
              {t("invite.haveCode")}
            </Link>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>{t("footer.copyright")}</span>
          <a href={LANGUAGE_URL} className={styles.link}>
            {t("footer.language")}
          </a>
        </div>
      </footer>
    </div>
  );
}
