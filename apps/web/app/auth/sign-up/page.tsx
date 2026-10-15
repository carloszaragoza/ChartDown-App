import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Link as AstryxLink } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { enabledProviders } from "../../../lib/auth/providers";
import { SIGNUP_EMAIL_COOKIE } from "../../../lib/auth/signup";
import { claimInvite, signUp, startOver } from "../actions";
import { AcceptAndContinue } from "../AuthControls";
import { AuthForm, AuthPage, Field } from "../AuthPage";
import { ProviderButtons } from "../ProviderButtons";

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
        <Banner status="success" title={t("signUp.sent")} />
        <VStack gap={1}>
          <Text color="secondary">{t("signUp.notArrived")}</Text>
          <Text>
            <Link href="/auth/confirm-again">{t("confirmAgain.link")}</Link>
          </Text>
        </VStack>
      </AuthPage>
    );
  }

  if (!claimed) {
    return (
      <AuthPage title={t("signUp.title")} error={error}>
        <AuthForm action={claimInvite}>
          <Field label={t("signUp.code")} name="code" autoComplete="off" />
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <AcceptAndContinue
            label={t("signUp.acceptPlain")}
            submit={t("signUp.continue")}
            links={
              <Text type="supporting">
                {t.rich("signUp.readTerms", {
                  terms: (chunks) => (
                    <AstryxLink href="/terms" target="_blank">
                      {chunks}
                    </AstryxLink>
                  ),
                  privacy: (chunks) => (
                    <AstryxLink href="/privacy" target="_blank">
                      {chunks}
                    </AstryxLink>
                  ),
                })}
              </Text>
            }
          />
        </AuthForm>
        <VStack gap={1}>
          <Text color="secondary">
            {t("signUp.noCode")} <Link href="/auth/waitlist">{t("waitlist.title")}</Link>
          </Text>
          <Text color="secondary">
            {t("signUp.hasAccount")} <Link href="/auth/sign-in">{t("signIn.title")}</Link>
          </Text>
        </VStack>
      </AuthPage>
    );
  }

  const providers = await enabledProviders();
  return (
    <AuthPage title={t("signUp.title")} error={error}>
      <Text color="secondary">{t("signUp.forEmail", { email: claimed })}</Text>
      <AuthForm action={signUp}>
        <Field label={t("name")} name="name" autoComplete="name" />
        <Field
          label={t("password")}
          hint={t("signUp.passwordHint")}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" label={t("signUp.submit")} width="100%" />
      </AuthForm>
      {providers.length > 0 && <Text type="supporting">{t("signUp.providerHint")}</Text>}
      <ProviderButtons providers={providers} />
      <form action={startOver}>
        <HStack>
          <Button type="submit" variant="ghost" label={t("signUp.differentCode")} />
        </HStack>
      </form>
    </AuthPage>
  );
}
