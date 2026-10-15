import { rootCallback } from "../lib/auth/callback";
import { authEnabled, waitlistEnabled } from "../lib/auth/enabled";
import { createClient, readUser } from "../lib/supabase/server";
import { redirect } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { VStack } from "@astryxdesign/core/VStack";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { BAND_COOKIE } from "../lib/shell/shell";
import { loadHome, type UsagePeriod } from "./_home/load";
import { HomeView } from "./_home/HomeView";
import type { Metadata } from "next";
import { Landing } from "./_landing/Landing";
import { Invitations, type Invitation } from "./_components/Invitations";

type Search = Promise<Record<string, string | string[] | undefined>>;

/** The landing's title and description, for search and link previews (T-1310). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
  };
}

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  // A sign-in Supabase sent back here instead of /auth/callback finishes there (T-401).
  const callback = authEnabled() ? rootCallback(search) : null;
  if (callback) redirect(callback);
  const text = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  const [password, account] = [text(search.password), text(search.account)];
  // Visitors get the landing page (T-1201); signed-in people get their home.
  const landing = (
    <Landing
      signInEnabled={authEnabled()}
      waitlistReady={waitlistEnabled()}
      accountDeleted={account === "deleted"}
    />
  );
  if (!authEnabled()) return landing;
  const supabase = await createClient();
  const { data } = await readUser(supabase);
  if (!data.user) return landing;
  // Signed in: their Home (T-1308).
  const usage: UsagePeriod = search.usage === "7" ? 7 : search.usage === "all" ? null : 30;
  const [store, locale, invitations, a] = await Promise.all([
    cookies(),
    getLocale(),
    supabase.rpc("my_invitations").then((r) => (r.data ?? []) as Invitation[]),
    getTranslations("auth.account"),
  ]);
  const home = await loadHome(supabase, data.user.id, {
    chosenBand: store.get(BAND_COOKIE)?.value,
    usage,
    locale,
  });
  return (
    <HomeView
      data={home}
      usage={usage}
      messages={
        <VStack gap={3}>
          {account === "deleted" && <Banner status="success" title={a("accountDeleted")} />}
          {password === "updated" && <Banner status="success" title={a("passwordUpdated")} />}
          <Invitations invitations={invitations} />
        </VStack>
      }
    />
  );
}
