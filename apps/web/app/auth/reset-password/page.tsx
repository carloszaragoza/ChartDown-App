import { Button } from "@chartdown/ui";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { updatePassword } from "../actions";
import { AuthPage, Field } from "../AuthPage";
import styles from "../auth.module.css";

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
      <form action={updatePassword} className={styles.form}>
        <Field
          label={t("newPassword")}
          hint={t("signUp.passwordHint")}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <Field
          label={t("confirmPassword")}
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <Button type="submit" variant="primary">
          {t("reset.submit")}
        </Button>
      </form>
    </AuthPage>
  );
}
