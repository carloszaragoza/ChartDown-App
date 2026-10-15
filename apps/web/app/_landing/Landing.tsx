import { ChartDownLogo } from "@chartdown/ui";
import { parse } from "chartdown";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { LanguageSwitcher } from "../_components/LanguageSwitcher";
import { demoSections } from "./bars";
import { BarsView } from "./BarsView";
import { CONTACT, DEMO_KEYS, DEMO_SET, EXAMPLE_CHART, LANGUAGE_URL, SOCIAL } from "./example";
import {
  Chat,
  DarkBand,
  Drift,
  KeyFlip,
  Magnetic,
  Marquee,
  MotionRoot,
  ReadQuote,
  Rise,
  StandCycle,
  Stagger,
  TiltWindow,
  TypeLines,
  WriteIn,
  Words,
} from "./motion";
import { Headline } from "./Headline";
import { WaitlistForm, type WaitlistWords } from "./WaitlistForm";
import styles from "./landing.module.css";

export interface LandingProps {
  /** Whether sign-in is open here: Sign in and "I have an invite code" (R-01.7). */
  signInEnabled: boolean;
  /** Whether the waitlist form can be used here (R-01.8). */
  waitlistReady: boolean;
  /** The person just deleted their account (R-01.6). */
  accountDeleted?: boolean;
}

/** The MD tag, as the app draws it. */
function Md() {
  return <span className={styles.md}>MD</span>;
}

/** How a line of ChartDown is colored in the code card. */
function tone(line: string): "meta" | "section" | "note" | "bars" | "blank" {
  if (line === "") return "blank";
  if (line.startsWith("##")) return "section";
  if (line.startsWith(">")) return "note";
  if (/^[-a-z]+:|^---$/.test(line)) return "meta";
  return "bars";
}

/**
 * The landing page at chartdown.app (T-1310, design handoff: Landing version 3). It looks like
 * the app, always light, and moves: an opening curtain draws the logo, headlines rise word by
 * word, the chart window stands up as it scrolls in, and each feature shows itself working.
 */
export function Landing({ signInEnabled, waitlistReady, accountDeleted = false }: LandingProps) {
  const t = useTranslations("landing");
  const account = useTranslations("auth.account");
  const chart = parse(EXAMPLE_CHART);
  const sections = demoSections(EXAMPLE_CHART);
  const [verse, chorus] = sections;
  const keys = DEMO_KEYS.map((key) => ({
    key,
    label: t("features.f1.key", { key }),
    bars: demoSections(EXAMPLE_CHART, "letters", key)[0]?.bars ?? [],
  }));
  const header = chart.header as { key?: string; tempo?: number; meter?: string };
  const form = (withRole: boolean): WaitlistWords => ({
    label: withRole ? t("waitlist.email") : t("hero.formLabel"),
    placeholder: t("waitlist.placeholder"),
    submit: t("waitlist.submit"),
    saving: t("waitlist.saving"),
    hint: withRole ? t("waitlist.hint") : t("hero.hint"),
    sent: t("waitlist.sent"),
    invalid: t("waitlist.invalid"),
    error: t("waitlist.error"),
    unavailable: t("waitlist.unavailable"),
    ...(withRole
      ? {
          role: t("waitlist.role"),
          roles: {
            music_director: t("waitlist.roles.music_director"),
            musician: t("waitlist.roles.musician"),
            teacher: t("waitlist.roles.teacher"),
          },
        }
      : {}),
  });
  const m = (key: string) => t(`problem.messages.${key}`);

  return (
    <MotionRoot>
      {/* Always light (design handoff, Landing version 3): the page looks like the app. */}
      <div className={styles.landing} data-theme="light">
        <div className={styles.curtain} aria-hidden="true">
          <ChartDownLogo variant="symbol" size={72} className={styles.curtainLogo ?? ""} />
        </div>

        <header className={styles.header}>
          <nav className={styles.nav} aria-label={t("nav.label")}>
            <a href="#top" className={styles.brand} aria-label={t("nav.home")}>
              <ChartDownLogo size={30} />
            </a>
            <div className={styles.navLinks}>
              <a href="#problem" className={`${styles.navLink} ${styles.anchorLink}`}>
                {t("nav.why")}
              </a>
              <a href="#features" className={`${styles.navLink} ${styles.anchorLink}`}>
                {t("nav.features")}
              </a>
              <a href="#open" className={`${styles.navLink} ${styles.anchorLink}`}>
                {t("nav.open")}
              </a>
              {signInEnabled && (
                <Link href="/catalog" className={styles.navLink}>
                  {t("nav.catalog")}
                </Link>
              )}
              {signInEnabled && (
                <Link href="/auth/sign-in" className={styles.secondary}>
                  {t("nav.signIn")}
                </Link>
              )}
              <a href="#waitlist" className={styles.primary}>
                {t("nav.join")}
              </a>
            </div>
          </nav>
        </header>

        <main>
          {accountDeleted && (
            <p role="status" className={styles.notice}>
              {account("accountDeleted")}
            </p>
          )}

          <section id="top" className={styles.hero}>
            <div className={styles.heroText}>
              <p
                className={`${styles.badge} ${styles.enter}`}
                style={{ "--d": 0 } as CSSProperties}
              >
                <span className={styles.md}>{t("hero.tag")}</span>
                {t("hero.tagText")}
              </p>
              <Headline
                same={t("hero.same")}
                pairs={(["p1", "p2", "p3", "p4", "p5", "p6"] as const).map((pair) => ({
                  who: t(`hero.pairs.${pair}.who`),
                  when: t(`hero.pairs.${pair}.when`),
                }))}
              />
              <p className={`${styles.lead} ${styles.enter}`} style={{ "--d": 5 } as CSSProperties}>
                {t("hero.lead")}
              </p>
              <div
                className={`${styles.heroForm} ${styles.enter}`}
                style={{ "--d": 6 } as CSSProperties}
              >
                <WaitlistForm source="hero" ready={waitlistReady} words={form(false)} />
                {signInEnabled && (
                  <Link href="/auth/sign-up" className={styles.textLink}>
                    {t("hero.hasCode")}
                  </Link>
                )}
              </div>
            </div>

            <div
              className={`${styles.windowWrap} ${styles.enter}`}
              style={{ "--d": 7 } as CSSProperties}
            >
              <TiltWindow>
                <div className={styles.window} role="img" aria-label={t("window.label")}>
                  <div className={styles.chrome}>
                    <span className={styles.lights}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className={styles.url}>chartdown.app</span>
                  </div>
                  <div className={styles.screen}>
                    <div className={styles.songHead}>
                      <div className={styles.songInfo}>
                        <span className={styles.meta}>{t("window.byline")}</span>
                        <span className={styles.songTitle}>{chart.header.title}</span>
                        <span className={styles.tags}>
                          <span className={styles.chip}>
                            {t("window.key", { key: header.key ?? "E" })}
                          </span>
                          <span className={styles.chip}>
                            {t("window.time", { meter: header.meter ?? "4/4" })}
                          </span>
                          <span className={styles.chip}>
                            {t("window.tempo", { tempo: header.tempo ?? 72 })}
                          </span>
                        </span>
                        <span className={styles.meta}>{t("window.arrangement")}</span>
                      </div>
                      <div className={styles.actions}>
                        <span className={styles.fakeDark}>{t("window.stand")}</span>
                        <span className={`${styles.fake} ${styles.wide}`}>{t("window.edit")}</span>
                        <span className={`${styles.fake} ${styles.wide}`}>
                          {t("window.history")}
                        </span>
                        <span className={`${styles.fake} ${styles.wide}`}>
                          {t("window.myNotes")}
                        </span>
                      </div>
                    </div>
                    <div className={styles.controls}>
                      <span className={styles.segmentedStill}>
                        <span className={styles.segmentOn}>{t("window.numbers")}</span>
                        <span>{t("window.letters")}</span>
                      </span>
                      <span className={styles.meta}>{t("window.beats")}</span>
                      <span className={styles.segmentedStill}>
                        <span>{t("window.off")}</span>
                        <span className={styles.segmentOn}>{t("window.auto")}</span>
                        <span>{t("window.always")}</span>
                      </span>
                    </div>
                    <div className={styles.jumps}>
                      {["V1", "C1", "V2", "B", "C2"].map((jump) => (
                        <span key={jump} className={styles.jump}>
                          {jump}
                        </span>
                      ))}
                    </div>
                    <div className={styles.sectionCard}>
                      <div className={styles.sectionHead}>
                        <span className={styles.sectionName}>{verse?.name}</span>
                        <span className={styles.meta}>
                          {t("window.bars", { count: verse?.length ?? 4 })}
                        </span>
                      </div>
                      <p className={styles.note}>
                        <Md />
                        {verse?.note}
                      </p>
                      <BarsView bars={verse?.bars ?? []} size="lg" pulse />
                    </div>
                  </div>
                </div>
              </TiltWindow>
            </div>
          </section>

          <Marquee words={Object.values(t.raw("marquee") as Record<string, string>)} />

          <section id="problem" className={styles.problem} aria-labelledby="problem-title">
            <div className={styles.split}>
              <div className={styles.copy}>
                <Rise>
                  <span className={styles.md}>{t("problem.tag")}</span>
                </Rise>
                <h2 id="problem-title" className={styles.h2}>
                  <Words text={t("problem.title")} />
                </h2>
                <Rise delay={0.1}>
                  <p className={styles.body}>{t("problem.body")}</p>
                </Rise>
                <Rise delay={0.2}>
                  <p className={styles.answer}>{t("problem.answer")}</p>
                </Rise>
              </div>
              <Chat
                className={styles.chat}
                label={t("problem.chatLabel")}
                items={[
                  { side: "in", node: <p className={styles.chatTitle}>{t("problem.chat")}</p> },
                  {
                    side: "in",
                    node: (
                      <p className={styles.bubble}>
                        <span className={styles.who}>{m("dani")}</span>
                        {m("sending")}
                      </p>
                    ),
                  },
                  {
                    side: "in",
                    node: (
                      <p className={styles.file}>
                        <span className={styles.pdf}>PDF</span>
                        {m("file1")}
                      </p>
                    ),
                  },
                  { side: "out", node: <p className={styles.bubbleOut}>{m("old")}</p> },
                  {
                    side: "in",
                    node: (
                      <p className={`${styles.file} ${styles.shake}`}>
                        <span className={styles.pdf}>PDF</span>
                        {m("file2")}
                      </p>
                    ),
                  },
                  {
                    side: "in",
                    node: (
                      <p className={styles.bubble}>
                        <span className={styles.who}>{m("marco")}</span>
                        {m("which")}
                      </p>
                    ),
                  },
                  {
                    side: "in",
                    node: (
                      <p className={styles.bubble}>
                        <span className={styles.who}>{m("lu")}</span>
                        {m("bridge")}
                      </p>
                    ),
                  },
                ]}
              />
            </div>
          </section>

          <section id="features" className={styles.features} aria-label={t("features.label")}>
            <article className={styles.feature}>
              <Drift>01</Drift>
              <div className={styles.copy}>
                <Rise>
                  <span className={styles.number}>01</span>
                </Rise>
                <h3 className={styles.h3}>
                  <Words text={t("features.f1.title")} />
                </h3>
                <Rise delay={0.1}>
                  <p className={styles.body}>{t("features.f1.body")}</p>
                </Rise>
              </div>
              <Rise delay={0.15} className={styles.visual}>
                <KeyFlip
                  numbers={verse?.bars ?? []}
                  keys={keys}
                  words={{
                    numbers: t("window.numbers"),
                    letters: t("window.letters"),
                    label: t("features.f1.visual"),
                  }}
                />
              </Rise>
            </article>

            <article className={`${styles.feature} ${styles.reversed}`}>
              <Drift>02</Drift>
              <div className={styles.copy}>
                <Rise>
                  <span className={styles.number}>02</span>
                </Rise>
                <h3 className={styles.h3}>
                  <Words text={t("features.f2.title")} />
                </h3>
                <Rise delay={0.1}>
                  <p className={styles.body}>{t("features.f2.body")}</p>
                </Rise>
              </div>
              <Rise delay={0.15} className={styles.visual}>
                <div className={styles.panel} role="img" aria-label={t("features.f2.visual")}>
                  <div className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionName}>{chorus?.name}</span>
                      <span className={styles.meta}>
                        {t("window.bars", { count: chorus?.length ?? 4 })}
                      </span>
                    </div>
                    <p className={styles.note}>
                      <Md />
                      <WriteIn delay={0.3}>{chorus?.note}</WriteIn>
                    </p>
                    <BarsView bars={chorus?.bars ?? []} size="md" />
                  </div>
                  <Rise delay={1.2} className={styles.myNote}>
                    <span className={styles.chipStrong}>{t("features.f2.myNotes")}</span>
                    {t("features.f2.myNote")}
                  </Rise>
                </div>
              </Rise>
            </article>

            <article className={styles.feature}>
              <Drift>03</Drift>
              <div className={styles.copy}>
                <Rise>
                  <span className={styles.number}>03</span>
                </Rise>
                <h3 className={styles.h3}>
                  <Words text={t("features.f3.title")} />
                </h3>
                <Rise delay={0.1}>
                  <p className={styles.body}>{t("features.f3.body")}</p>
                </Rise>
              </div>
              <Rise delay={0.15} className={styles.visual}>
                <div className={styles.ipad} role="img" aria-label={t("features.f3.visual")}>
                  <StandCycle
                    title={chart.header.title ?? ""}
                    sections={sections.slice(1).concat(sections.slice(0, 1))}
                  />
                </div>
              </Rise>
            </article>

            <article className={`${styles.feature} ${styles.reversed}`}>
              <Drift>04</Drift>
              <div className={styles.copy}>
                <Rise>
                  <span className={styles.number}>04</span>
                </Rise>
                <h3 className={styles.h3}>
                  <Words text={t("features.f4.title")} />
                </h3>
                <Rise delay={0.1}>
                  <p className={styles.body}>{t("features.f4.body")}</p>
                </Rise>
              </div>
              <Rise delay={0.15} className={styles.visual}>
                <div className={styles.panel} role="img" aria-label={t("features.f4.visual")}>
                  <div className={styles.setCard}>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionName}>{t("features.f4.setName")}</span>
                      <span className={styles.meta}>{t("features.f4.when")}</span>
                    </div>
                    <Stagger
                      ordered
                      className={styles.setList}
                      items={DEMO_SET.map((song, index) => ({
                        key: song.title,
                        node: (
                          <>
                            <span className={styles.setSong}>
                              <span className={styles.setIndex}>{index + 1}</span>
                              {song.title}
                            </span>
                            <span className={styles.chip}>
                              {t("window.key", { key: song.key })}
                            </span>
                          </>
                        ),
                      }))}
                    />
                  </div>
                  <Rise delay={0.9} className={styles.myNote}>
                    <span className={styles.chipStrong}>{t("features.f4.shared")}</span>
                    {t("features.f4.sharedWith")}
                  </Rise>
                </div>
              </Rise>
            </article>

            <article className={styles.feature}>
              <Drift>05</Drift>
              <div className={styles.copy}>
                <Rise>
                  <span className={styles.number}>05</span>
                </Rise>
                <h3 className={styles.h3}>
                  <Words text={t("features.f5.title")} />
                </h3>
                <Rise delay={0.1}>
                  <p className={styles.body}>{t("features.f5.body")}</p>
                </Rise>
              </div>
              <Rise delay={0.15} className={styles.visual}>
                <div className={styles.panel} role="img" aria-label={t("features.f5.visual")}>
                  <p className={styles.versions}>
                    <span className={styles.fakeDark}>{t("features.f5.live")}</span>
                    <span className={styles.fakeLine}>{t("features.f5.acoustic")}</span>
                    <span className={styles.fakeLine}>{t("features.f5.new")}</span>
                  </p>
                  <div className={styles.setCard}>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionName}>{t("features.f5.history")}</span>
                    </div>
                    <Stagger
                      className={styles.history}
                      items={(["r3", "r2", "r1"] as const).map((revision, index) => ({
                        key: revision,
                        className: index === 0 ? styles.historyNow : styles.historyItem,
                        node: (
                          <>
                            <span className={styles.dot} aria-hidden="true" />
                            <span>
                              <span className={styles.name}>
                                {t(`features.f5.${revision}.title`)}
                              </span>
                              <span className={styles.meta}>
                                {t(`features.f5.${revision}.when`)}
                              </span>
                            </span>
                          </>
                        ),
                      }))}
                    />
                  </div>
                </div>
              </Rise>
            </article>
          </section>

          <DarkBand id="open" className={styles.open}>
            <div className={styles.split}>
              <div className={styles.copy}>
                <h2 className={styles.h2}>
                  <Words text={t("open.title1")} />
                  <br />
                  <Words text={t("open.title2")} />
                </h2>
                <Rise delay={0.1}>
                  <p className={styles.bodyDark}>{t("open.body")}</p>
                </Rise>
                <Rise delay={0.2}>
                  <Magnetic>
                    <a href={LANGUAGE_URL} className={styles.light}>
                      {t("open.cta")}
                    </a>
                  </Magnetic>
                </Rise>
              </div>
              <Rise delay={0.15} className={styles.visual}>
                <TypeLines
                  label={t("open.codeLabel")}
                  lines={EXAMPLE_CHART.split("\n").map((text) => ({ text, tone: tone(text) }))}
                />
              </Rise>
            </div>
          </DarkBand>

          <section className={styles.founder} aria-label={t("founder.name")}>
            <Rise>
              <Md />
            </Rise>
            <ReadQuote text={`“${t("founder.quote")}”`} />
            <Rise className={styles.person}>
              <span className={styles.avatar} aria-hidden="true">
                CZ
              </span>
              <span>
                <span className={styles.name}>{t("founder.name")}</span>
                <span className={styles.meta}>{t("founder.role")}</span>
              </span>
            </Rise>
          </section>

          <section
            id="waitlist"
            className={styles.waitlistSection}
            aria-labelledby="waitlist-title"
          >
            {/* Links from the ChartDown spec and its campaign point here. */}
            <span id="invite" className={styles.anchor} />
            <Rise scale className={styles.waitlistPanel}>
              <div className={styles.copy}>
                <h2 id="waitlist-title" className={styles.h2big}>
                  <Words text={t("waitlist.title")} />
                </h2>
                <p className={styles.body}>{t("waitlist.body")}</p>
              </div>
              <div className={styles.waitlistForm}>
                <WaitlistForm
                  source="final_cta"
                  withRole
                  ready={waitlistReady}
                  words={form(true)}
                />
              </div>
            </Rise>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <ChartDownLogo size={24} />
            <nav aria-label={t("footer.label")} className={styles.footerLinks}>
              <a href={`mailto:${CONTACT}`}>{t("footer.contact")}</a>
              <a href={LANGUAGE_URL}>{t("footer.github")}</a>
              {SOCIAL.map((account) => (
                <a key={account.key} href={account.href} target="_blank" rel="noopener noreferrer">
                  {t(`footer.${account.key}`)}
                </a>
              ))}
              <Link href="/privacy">{t("footer.privacy")}</Link>
              <Link href="/terms">{t("footer.terms")}</Link>
            </nav>
            <LanguageSwitcher />
          </div>
        </footer>
      </div>
    </MotionRoot>
  );
}
