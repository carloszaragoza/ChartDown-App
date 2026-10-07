import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslations } from "next-intl";
import { PROVIDER_NAMES, type Provider } from "../../lib/auth/providers";
import { signInWithProvider } from "./actions";

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
    <section aria-label={t("label")}>
      <VStack gap={2}>
        <Text type="supporting">{t("or")}</Text>
        {providers.map((provider) => (
          <form key={provider} action={signInWithProvider}>
            <input type="hidden" name="provider" value={provider} />
            <input type="hidden" name="next" value={next} />
            <Button
              type="submit"
              label={t("continueWith", { provider: PROVIDER_NAMES[provider] })}
              width="100%"
            />
          </form>
        ))}
      </VStack>
    </section>
  );
}
