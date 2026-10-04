import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { signUp } from "../actions";
import { AuthPage, Field } from "../AuthPage";
import styles from "../auth.module.css";

type Search = Promise<{ error?: string; sent?: string }>;

export default async function SignUpPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthPage title={t("signUp.title")} error={error}>
      {sent ? (
        <p role="status" className={styles.message}>
          {t("signUp.sent")}
        </p>
      ) : (
        <form action={signUp} className={styles.form}>
          <Field label={t("name")} name="name" type="text" autoComplete="name" maxLength={80} />
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <Field
            label={t("password")}
            hint={t("signUp.passwordHint")}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />
          <Button type="submit" variant="primary">
            {t("signUp.submit")}
          </Button>
        </form>
      )}
      <div className={styles.links}>
        <span>
          {t("signUp.hasAccount")} <Link href="/auth/sign-in">{t("signIn.title")}</Link>
        </span>
      </div>
    </AuthPage>
  );
}
