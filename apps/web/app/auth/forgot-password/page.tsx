import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { requestPasswordReset } from "../actions";
import { AuthPage, Field } from "../AuthPage";
import styles from "../auth.module.css";

type Search = Promise<{ error?: string; sent?: string }>;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthPage title={t("forgot.title")} error={error}>
      {sent ? (
        <p role="status" className={styles.message}>
          {t("forgot.sent")}
        </p>
      ) : (
        <form action={requestPasswordReset} className={styles.form}>
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <Button type="submit" variant="primary">
            {t("forgot.submit")}
          </Button>
        </form>
      )}
      <div className={styles.links}>
        <Link href="/auth/sign-in">{t("forgot.back")}</Link>
      </div>
    </AuthPage>
  );
}
