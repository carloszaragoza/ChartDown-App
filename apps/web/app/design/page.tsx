import {
  ACTION_ICONS,
  Button,
  Icon,
  INSTRUMENT_ICONS,
  InstrumentTag,
  type IconName,
} from "@chartdown/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { AtrilExample } from "./AtrilExample";

// Review page for comparing the components with the "ChartDown – Papel y tinta" design
// system. Development and preview builds only.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const INSTRUMENTS = Object.keys(INSTRUMENT_ICONS) as (keyof typeof INSTRUMENT_ICONS)[];

function Panel({ theme }: { theme: "light" | "dark" }) {
  const t = useTranslations("design");
  const name = useTranslations("instruments");
  const chart = useTranslations("chart");
  const row = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "var(--space-4)",
  } as const;
  const heading = { font: "var(--type-label)", color: "var(--ink-muted)", margin: 0 } as const;
  return (
    <section
      data-theme={theme}
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        padding: "var(--space-6)",
        display: "grid",
        gap: "var(--space-6)",
      }}
    >
      <h2 style={{ font: "var(--type-section-title)", margin: 0 }}>{t(theme)}</h2>

      <h3 style={heading}>{t("buttons")}</h3>
      <div style={row}>
        <Button icon="previous">{t("previous")}</Button>
        <Button variant="primary" icon="next">
          {t("next")}
        </Button>
        <Button variant="view-as" icon="view-as">
          {name("keys")}
        </Button>
        <Button icon="download">{t("downloadSet")}</Button>
        <Button icon="settings" aria-label={t("settings")} />
        <Button icon="download" disabledReason={t("offline")}>
          {t("downloadSet")}
        </Button>
      </div>

      <h3 style={heading}>{t("tags")}</h3>
      <div style={row}>
        {INSTRUMENTS.map((id) => (
          <InstrumentTag key={id} instrument={id} label={name(id)} />
        ))}
        <InstrumentTag instrument="cajon" label={t("newInstrument")} />
      </div>
      <div style={row}>
        {INSTRUMENTS.map((id) => (
          <InstrumentTag key={id} instrument={id} label={name(id)} variant="compact" />
        ))}
        <InstrumentTag instrument="cajon" label={t("newInstrument")} variant="compact" />
      </div>

      <h3 style={heading}>{chart("example")}</h3>
      <div style={{ background: "var(--ground)", padding: "var(--space-6)" }}>
        <AtrilExample />
      </div>

      <h3 style={heading}>{t("icons")}</h3>
      <div style={row}>
        {(Object.keys(ACTION_ICONS) as IconName[]).map((icon) => (
          <span
            key={icon}
            style={{
              display: "grid",
              justifyItems: "center",
              gap: "var(--space-1)",
              font: "var(--type-caption)",
              color: "var(--ink-muted)",
            }}
          >
            <span style={{ color: "var(--ink)" }}>
              <Icon name={icon} size={28} />
            </span>
            <code>{icon}</code>
          </span>
        ))}
      </div>
    </section>
  );
}

export default function DesignPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const t = useTranslations("design");
  return (
    <main style={{ padding: "var(--space-10)", display: "grid", gap: "var(--space-6)" }}>
      <h1 style={{ font: "var(--type-song-title)", margin: 0 }}>{t("title")}</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 560px), 1fr))",
          gap: "var(--space-6)",
        }}
      >
        <Panel theme="light" />
        <Panel theme="dark" />
      </div>
    </main>
  );
}
