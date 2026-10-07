import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { requestPasswordReset } from "../actions";
import { AuthForm, AuthPage, Field } from "../AuthPage";

type Search = Promise<{ error?: string; sent?: string }>;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthPage title={t("forgot.title")} error={error}>
      {sent ? (
        <Banner status="success" title={t("forgot.sent")} />
      ) : (
        <AuthForm action={requestPasswordReset}>
          <Field label={t("email")} name="email" type="email" autoComplete="email" />
          <Button type="submit" variant="primary" label={t("forgot.submit")} width="100%" />
        </AuthForm>
      )}
      <Text>
        <Link href="/auth/sign-in">{t("forgot.back")}</Link>
      </Text>
    </AuthPage>
  );
}
