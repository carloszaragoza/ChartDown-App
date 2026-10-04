import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Home() {
  const t = useTranslations("home");
  return (
    <main style={{ padding: "var(--space-10)", display: "grid", gap: "var(--space-6)" }}>
      <LanguageSwitcher />
      <h1 style={{ font: "var(--type-song-title)", margin: 0 }}>{t("title")}</h1>
      <p style={{ margin: 0, color: "var(--ink-muted)" }}>{t("tagline")}</p>
    </main>
  );
}
