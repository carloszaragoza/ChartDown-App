import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../_legal/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslations("legal"))("privacy")} · ChartDown App` };
}

/** The Privacy Notice (T-1202). */
export default function PrivacyPage() {
  return <LegalPage document="privacy" />;
}
