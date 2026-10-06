import { Button } from "@chartdown/ui";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { enabledProviders } from "../../../lib/auth/providers";
import { SIGNUP_EMAIL_COOKIE } from "../../../lib/auth/signup";
import { claimInvite, signUp, startOver } from "../actions";
import { AuthPage, Field } from "../AuthPage";
import { ProviderButtons } from "../ProviderButtons";
import styles from "../auth.module.css";

type Search = Promise<{ error?: string; sent?: string }>;

/** Creating an account: an invite code and email first (R-01.7), then a password or a provider. */
export default async function SignUpPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth");
  const claimed = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;

  if (sent) {
    return (
      <AuthPage title={t("signUp.title")}>
        <p role="status" className={styles.message}>
          {t("signUp.sent")}
        </p>
      </AuthPage>
    );
  }

  if (!claimed) {
    return (
      <AuthPage title={t("signUp.title")} error={error}>
        <form action={claimInvite} className={styles.form}>
          <Field
            label={t("signUp.code")}
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <label className={styles.accept}>
            <input type="checkbox" name="terms" value="accepted" required />
            <span>
              {t.rich("signUp.acceptTerms", {
                terms: (chunks) => (
                  <Link href="/terms" target="_blank">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" target="_blank">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
          <Button type="submit" variant="primary">
            {t("signUp.continue")}
          </Button>
        </form>
        <div className={styles.links}>
          <span>
            {t("signUp.noCode")} <Link href="/auth/waitlist">{t("waitlist.title")}</Link>
          </span>
          <span>
            {t("signUp.hasAccount")} <Link href="/auth/sign-in">{t("signIn.title")}</Link>
          </span>
        </div>
      </AuthPage>
    );
  }

  const providers = await enabledProviders();
  return (
    <AuthPage title={t("signUp.title")} error={error}>
      <p className={styles.message}>{t("signUp.forEmail", { email: claimed })}</p>
      <form action={signUp} className={styles.form}>
        <Field label={t("name")} name="name" type="text" autoComplete="name" maxLength={80} />
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
      {providers.length > 0 && <p className={styles.hint}>{t("signUp.providerHint")}</p>}
      <ProviderButtons providers={providers} />
      <form action={startOver} className={styles.links}>
        <Button type="submit">{t("signUp.differentCode")}</Button>
      </form>
    </AuthPage>
  );
}
