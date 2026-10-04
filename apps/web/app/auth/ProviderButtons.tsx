import { Button } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { PROVIDER_NAMES, type Provider } from "../../lib/auth/providers";
import { signInWithProvider } from "./actions";
import styles from "./auth.module.css";

/** One "Continue with …" button per provider enabled in Supabase; nothing when there are none. */
export function ProviderButtons({
  providers,
  next = "/",
}: {
  providers: readonly Provider[];
  next?: string;
}) {
  const t = useTranslations("auth.providers");
  if (providers.length === 0) return null;
  return (
    <section className={styles.providers} aria-label={t("label")}>
      <p className={styles.hint}>{t("or")}</p>
      {providers.map((provider) => (
        <form key={provider} action={signInWithProvider}>
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="next" value={next} />
          <Button type="submit" className={styles.provider}>
            {t("continueWith", { provider: PROVIDER_NAMES[provider] })}
          </Button>
        </form>
      ))}
    </section>
  );
}
