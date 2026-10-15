import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { enabledProviders } from "../../../lib/auth/providers";
import { safeNext } from "../../../lib/auth/redirect";
import { signIn } from "../actions";
import { AuthForm, AuthPage, Field } from "../AuthPage";
import { ProviderButtons } from "../ProviderButtons";

type Search = Promise<{ error?: string; next?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, next } = await searchParams;
  const t = await getTranslations("auth");
  const providers = await enabledProviders();
  return (
    <AuthPage title={t("signIn.title")} error={error}>
      <AuthForm action={signIn}>
        <input type="hidden" name="next" value={safeNext(next)} />
        <Field label={t("email")} name="email" type="email" autoComplete="email" />
        <Field
          label={t("password")}
          name="password"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" variant="primary" label={t("signIn.submit")} width="100%" />
      </AuthForm>
      <ProviderButtons providers={providers} next={safeNext(next)} />
      <VStack gap={1}>
        <Text>
          <Link href="/auth/forgot-password">{t("signIn.forgot")}</Link>
        </Text>
        {error === "email_not_confirmed" && (
          <Text>
            <Link href="/auth/confirm-again">{t("confirmAgain.link")}</Link>
          </Text>
        )}
        <Text color="secondary">
          {t("signIn.noAccount")} <Link href="/auth/sign-up">{t("signUp.title")}</Link>
        </Text>
      </VStack>
    </AuthPage>
  );
}
