import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout } from "@astryxdesign/core/Layout";
import { getTranslations } from "next-intl/server";

/** On a phone the visual editor isn't offered yet; the Chart editor is (R-13.12). */
export async function PhoneOnly({ href }: { href: string }) {
  const t = await getTranslations("visual");
  const nav = await getTranslations("nav");
  return (
    <Layout height="auto" padding={8}>
      <EmptyState
        title={t("overline")}
        description={t("phone")}
        actions={<Button label={nav("editor")} variant="primary" href={href} />}
      />
    </Layout>
  );
}
