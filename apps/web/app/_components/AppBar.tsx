"use client";

import { Button } from "@chartdown/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "../auth/actions";
import styles from "./AppBar.module.css";
import { LanguageSwitcher } from "./LanguageSwitcher";

export interface AppBarProps {
  /** The signed-in person, or null for a visitor. */
  account: { name: string } | null;
  /** Their personal space's sets (R-04.7). */
  personalSets: string | null;
}

/** The initials of a name, for the account button: “Alex Rivera” → AR. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters
    .map((word) => word?.charAt(0).toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

/**
 * The app's top bar (Handoff 4, `design/screens/01-set.html`): ChartDown, Sets, Catalog, Bands,
 * Personal space, the language and the account. Stand mode has none, since it fills the screen.
 */
export function AppBar({ account, personalSets }: AppBarProps) {
  const t = useTranslations("appBar");
  const pathname = usePathname() ?? "/";
  if (pathname.endsWith("/stand")) return null;
  // A visitor's home is the landing page, which has its own top bar (T-1201).
  if (!account && pathname === "/") return null;

  const links = account
    ? [
        {
          href: "/sets",
          label: t("sets"),
          active: pathname === "/sets" || pathname.startsWith("/sets/"),
        },
        {
          href: "/catalog",
          label: t("catalog"),
          active: pathname.startsWith("/catalog") || pathname.startsWith("/songs"),
        },
        {
          href: "/bands",
          label: t("bands"),
          active:
            pathname === "/bands" ||
            (pathname.startsWith("/bands/") && !isPersonal(pathname, personalSets)),
        },
        ...(personalSets
          ? [
              {
                href: personalSets,
                label: t("personal"),
                active: isPersonal(pathname, personalSets),
              },
            ]
          : []),
      ]
    : [{ href: "/catalog", label: t("catalog"), active: pathname.startsWith("/catalog") }];

  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label={t("home")}>
        ChartDown
      </Link>
      <nav aria-label={t("main")} className={styles.nav}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.link}
            aria-current={link.active ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.end}>
        <LanguageSwitcher />
        {account ? (
          <details className={styles.account}>
            <summary
              className={styles.accountButton}
              aria-label={t("account", { name: account.name })}
            >
              <span className={styles.avatar} aria-hidden="true">
                {initials(account.name)}
              </span>
              <span>{account.name.split(/\s+/)[0]}</span>
            </summary>
            <div className={styles.menu}>
              <Link href="/profile" className={styles.menuItem}>
                {t("profile")}
              </Link>
              <form action={signOut}>
                <Button type="submit">{t("signOut")}</Button>
              </form>
            </div>
          </details>
        ) : (
          <Link href="/auth/sign-in" className="cd-button cd-button--secondary">
            {t("signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}

function isPersonal(pathname: string, personalSets: string | null): boolean {
  return Boolean(personalSets && pathname.startsWith(personalSets));
}
