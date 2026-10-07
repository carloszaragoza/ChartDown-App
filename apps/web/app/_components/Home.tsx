import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export interface HomeProps {
  /** Whether sign-in is available here (hidden in production until T-402). */
  signInEnabled?: boolean;
  /** The signed-in person, if any. */
  account?: { name: string } | null;
  passwordUpdated?: boolean;
  accountDeleted?: boolean;
  /** Shown under the messages, such as the person's band invitations. */
  children?: ReactNode;
}

export function Home({
  signInEnabled = false,
  account = null,
  passwordUpdated = false,
  accountDeleted = false,
  children,
}: HomeProps) {
  const t = useTranslations("home");
  const a = useTranslations("auth.account");
  return (
    <div style={{ padding: "var(--space-10)", display: "grid", gap: "var(--space-6)" }}>
      {/* With sign-in, the top bar holds the language, catalog, bands and account. */}
      {!signInEnabled && <LanguageSwitcher />}
      {signInEnabled && account && (
        <div
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-4)" }}
        >
          <span style={{ font: "var(--type-meta)" }}>
            {a("signedInAs", { name: account.name })}
          </span>
          <Link
            href="/versions/new"
            className="cd-button cd-button--primary"
            style={{ textDecoration: "none" }}
          >
            {t("newVersion")}
          </Link>
        </div>
      )}
      {accountDeleted && (
        <p role="status" style={{ margin: 0 }}>
          {a("accountDeleted")}
        </p>
      )}
      {passwordUpdated && (
        <p role="status" style={{ margin: 0 }}>
          {a("passwordUpdated")}
        </p>
      )}
      {children}
      <h1 style={{ font: "var(--type-song-title)", margin: 0 }}>{t("title")}</h1>
      <p style={{ margin: 0, color: "var(--ink-muted)" }}>{t("tagline")}</p>
    </div>
  );
}
