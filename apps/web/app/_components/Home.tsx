import { Button } from "@chartdown/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signOut } from "../auth/actions";
import { LanguageSwitcher } from "./LanguageSwitcher";

export interface HomeProps {
  /** Whether sign-in is available here (hidden in production until T-402). */
  signInEnabled?: boolean;
  /** The signed-in person, if any. */
  account?: { name: string } | null;
  passwordUpdated?: boolean;
}

export function Home({
  signInEnabled = false,
  account = null,
  passwordUpdated = false,
}: HomeProps) {
  const t = useTranslations("home");
  const a = useTranslations("auth.account");
  const p = useTranslations("profile");
  return (
    <main style={{ padding: "var(--space-10)", display: "grid", gap: "var(--space-6)" }}>
      <div
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-4)" }}
      >
        <LanguageSwitcher />
        {signInEnabled &&
          (account ? (
            <form
              action={signOut}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
            >
              <span style={{ font: "var(--type-meta)" }}>
                {a("signedInAs", { name: account.name })}
              </span>
              <Link
                href="/profile"
                className="cd-button cd-button--secondary"
                style={{ textDecoration: "none" }}
              >
                {p("link")}
              </Link>
              <Button type="submit">{a("signOut")}</Button>
            </form>
          ) : (
            <Link
              href="/auth/sign-in"
              className="cd-button cd-button--secondary"
              style={{ textDecoration: "none" }}
            >
              {a("signIn")}
            </Link>
          ))}
      </div>
      {passwordUpdated && (
        <p role="status" style={{ margin: 0 }}>
          {a("passwordUpdated")}
        </p>
      )}
      <h1 style={{ font: "var(--type-song-title)", margin: 0 }}>{t("title")}</h1>
      <p style={{ margin: 0, color: "var(--ink-muted)" }}>{t("tagline")}</p>
    </main>
  );
}
