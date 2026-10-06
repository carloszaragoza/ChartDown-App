import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../_legal/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslations("legal"))("terms")} · ChartDown App` };
}

/** The Terms of Use (T-1202). */
export default function TermsPage() {
  return <LegalPage document="terms" />;
}
