import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { isAuthError } from "../../lib/auth/errors";
import styles from "./auth.module.css";

export function AuthPage({
  title,
  error,
  children,
}: {
  title: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  const t = useTranslations("auth.errors");
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      {isAuthError(error) && (
        <p role="alert" className={styles.error}>
          {t(error)}
        </p>
      )}
      {children}
    </main>
  );
}

export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field}>
      {label}
      <input className={styles.input} required {...input} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
