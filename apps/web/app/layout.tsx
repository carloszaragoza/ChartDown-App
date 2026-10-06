import "@chartdown/ui/fonts.css";
import "@chartdown/ui/tokens.css";
import "@chartdown/ui/components.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { authEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { AppBar, type AppBarProps } from "./_components/AppBar";
import { NoticesLive } from "./_components/NoticesLive";
import { OfflineSync } from "./_components/OfflineSync";
import { ServiceWorker } from "./_components/ServiceWorker";

export const metadata: Metadata = {
  title: "ChartDown App",
  // Installed on the iPad home screen (T-901): its icon and full screen.
  appleWebApp: { capable: true, title: "ChartDown", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#17212b" },
  ],
};

/** Who is signed in, for the top bar; nothing while sign-in is hidden (production). */
async function barProps(): Promise<(AppBarProps & { userId: string | null }) | null> {
  if (!authEnabled()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return { account: null, personalSets: null, unread: 0, admin: false, userId: null };
  const [{ data: profile }, { data: personal }, { count }] = await Promise.all([
    supabase.from("profiles").select("name, role").eq("id", data.user.id).maybeSingle(),
    supabase.from("bands").select("id").eq("personal_owner_id", data.user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id)
      .is("read_at", null),
  ]);
  return {
    account: { name: profile?.name ?? data.user.email ?? "" },
    personalSets: personal ? `/bands/${personal.id}/sets` : null,
    unread: count ?? 0,
    admin: profile?.role === "admin",
    userId: data.user.id,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, bar] = await Promise.all([getLocale(), barProps()]);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <ServiceWorker />
          {bar && (
            <AppBar
              account={bar.account}
              personalSets={bar.personalSets}
              unread={bar.unread}
              admin={bar.admin}
            />
          )}
          {bar?.account && <OfflineSync />}
          {bar?.userId && <NoticesLive userId={bar.userId} />}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
