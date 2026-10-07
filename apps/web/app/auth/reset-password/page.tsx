import { Button } from "@astryxdesign/core/Button";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { updatePassword } from "../actions";
import { AuthForm, AuthPage, Field } from "../AuthPage";

type Search = Promise<{ error?: string }>;

/** Reached from a recovery link, which signs the person in first. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/sign-in?error=link_invalid");
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthPage title={t("reset.title")} error={error}>
      <AuthForm action={updatePassword}>
        <Field
          label={t("newPassword")}
          hint={t("signUp.passwordHint")}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <Field
          label={t("confirmPassword")}
          name="confirm"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" label={t("reset.submit")} width="100%" />
      </AuthForm>
    </AuthPage>
  );
}
