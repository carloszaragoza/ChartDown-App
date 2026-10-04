import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { joinWaitlist } from "../actions";
import { AuthPage, Field } from "../AuthPage";
import styles from "../auth.module.css";

type Search = Promise<{ error?: string; sent?: string }>;

/** Without an invite code, a person leaves their email (R-01.8). */
export default async function WaitlistPage({ searchParams }: { searchParams: Search }) {
  if (!authEnabled()) notFound();
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthPage title={t("waitlist.title")} error={error}>
      {sent ? (
        <p role="status" className={styles.message}>
          {t("waitlist.sent")}
        </p>
      ) : (
        <>
          <p className={styles.message}>{t("waitlist.intro")}</p>
          <form action={joinWaitlist} className={styles.form}>
            <Field label={t("email")} name="email" type="email" autoComplete="email" />
            <Button type="submit" variant="primary">
              {t("waitlist.submit")}
            </Button>
          </form>
        </>
      )}
      <div className={styles.links}>
        <Link href="/auth/sign-up">{t("waitlist.haveCode")}</Link>
      </div>
    </AuthPage>
  );
}
