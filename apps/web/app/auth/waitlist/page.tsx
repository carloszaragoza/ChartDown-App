import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { joinWaitlist } from "../actions";
import { AuthForm, AuthPage, Field } from "../AuthPage";

type Search = Promise<{ error?: string; sent?: string }>;

/** Without an invite code, a person leaves their email (R-01.8). */
export default async function WaitlistPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthPage title={t("waitlist.title")} error={error}>
      {sent ? (
        <Banner status="success" title={t("waitlist.sent")} />
      ) : (
        <>
          <Text color="secondary">{t("waitlist.intro")}</Text>
          <AuthForm action={joinWaitlist}>
            <Field label={t("email")} name="email" type="email" autoComplete="email" />
            <Button type="submit" variant="primary" label={t("waitlist.submit")} width="100%" />
          </AuthForm>
        </>
      )}
      <Text>
        <Link href="/auth/sign-up">{t("waitlist.haveCode")}</Link>
      </Text>
    </AuthPage>
  );
}
