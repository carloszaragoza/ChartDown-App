import { getTranslations } from "next-intl/server";

/**
 * Shown by the service worker when a page cannot be reached (T-901). Downloaded sets will open
 * without a connection with T-902.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main
      style={{
        display: "grid",
        gap: "var(--space-4)",
        maxWidth: "40rem",
        margin: "0 auto",
        padding: "var(--space-10) var(--space-4)",
      }}
    >
      <h1 style={{ margin: 0, font: "var(--type-song-title)" }}>{t("title")}</h1>
      <p style={{ margin: 0, font: "var(--type-note)" }}>{t("body")}</p>
      {/* A plain link on purpose: it loads the start page again from the network, not inside
          the app, once the connection is back. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="cd-button cd-button--primary" style={{ justifySelf: "start" }}>
        {t("retry")}
      </a>
    </main>
  );
}
