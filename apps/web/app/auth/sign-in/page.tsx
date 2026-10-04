import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { enabledProviders } from "../../../lib/auth/providers";
import { safeNext } from "../../../lib/auth/redirect";
import { signIn } from "../actions";
import { AuthPage, Field } from "../AuthPage";
import { ProviderButtons } from "../ProviderButtons";
import styles from "../auth.module.css";

type Search = Promise<{ error?: string; next?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, next } = await searchParams;
  const t = await getTranslations("auth");
  const providers = await enabledProviders();
  return (
    <AuthPage title={t("signIn.title")} error={error}>
      <form action={signIn} className={styles.form}>
        <input type="hidden" name="next" value={safeNext(next)} />
        <Field label={t("email")} name="email" type="email" autoComplete="email" />
        <Field
          label={t("password")}
          name="password"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" variant="primary">
          {t("signIn.submit")}
        </Button>
      </form>
      <ProviderButtons providers={providers} next={safeNext(next)} />
      <div className={styles.links}>
        <Link href="/auth/forgot-password">{t("signIn.forgot")}</Link>
        <span>
          {t("signIn.noAccount")} <Link href="/auth/sign-up">{t("signUp.title")}</Link>
        </span>
      </div>
    </AuthPage>
  );
}
