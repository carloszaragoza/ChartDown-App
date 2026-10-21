import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "../theme/chartdown.css";
import "../theme/chartdown-stand.css";
import "@chartdown/ui/fonts.css";
import "@chartdown/ui/tokens.css";
import "@chartdown/ui/components.css";
import "@chartdown/ui/chart.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { authEnabled } from "../lib/auth/enabled";
import { BAND_COOKIE } from "../lib/shell/shell";
import { createClient, readUser } from "../lib/supabase/server";
import { AstryxTheme } from "./_components/AstryxTheme";
import { NoticesLive } from "./_components/NoticesLive";
import { OfflineSync } from "./_components/OfflineSync";
import { ServiceWorker } from "./_components/ServiceWorker";
import { TimeZoneCookie } from "./_components/TimeZoneCookie";
import { TopEdge } from "./_components/TopEdge";
import { Shell, type ShellProps } from "./_components/Shell";

export const metadata: Metadata = {
  title: "ChartDown App",
  // Installed on the iPad home screen (T-901): its icon and full screen.
  appleWebApp: { capable: true, title: "ChartDown", statusBarStyle: "default" },
  // The logo kit's icons (Design Handoff 7): iPhone, iPad Pro and iPad home screens.
  icons: {
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icons/ipad-pro-167.png", sizes: "167x167" },
      { url: "/icons/ipad-152.png", sizes: "152x152" },
    ],
  },
  // Link previews use app/opengraph-image.png, from the logo kit.
  metadataBase: new URL("https://www.chartdown.app"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#17212b" },
  ],
};

/** Who is signed in and what the side navigation shows them; nothing while sign-in is hidden. */
async function shellProps(
  locale: string,
): Promise<(Omit<ShellProps, "children"> & { userId: string | null }) | null> {
  if (!authEnabled()) return null;
  const supabase = await createClient();
  const [{ data }, store] = await Promise.all([readUser(supabase), cookies()]);
  const chosenBand = store.get(BAND_COOKIE)?.value;
  if (!data.user)
    return { account: null, bands: [], chosenBand, unread: 0, openReports: 0, userId: null };
  const [{ data: profile }, { data: bands }, { data: mine }, { count }] = await Promise.all([
    supabase.from("profiles").select("name, role").eq("id", data.user.id).maybeSingle(),
    // Row-level security returns the bands the person is in, their personal space included.
    supabase.from("bands").select("id, name, is_personal").order("name"),
    supabase
      .from("user_instruments")
      .select("instrument:instruments(name_en, name_es)")
      .eq("user_id", data.user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.user.id)
      .is("read_at", null),
  ]);
  const admin = profile?.role === "admin";
  const openReports = admin
    ? ((
        await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
      ).count ?? 0)
    : 0;
  type Named = { name_en: string; name_es: string };
  const instruments = (mine ?? [])
    .flatMap((row) => {
      const instrument = (row as { instrument: Named | Named[] | null }).instrument;
      return Array.isArray(instrument) ? instrument : instrument ? [instrument] : [];
    })
    .map((instrument) => (locale === "es" ? instrument.name_es : instrument.name_en));
  return {
    account: { name: profile?.name ?? data.user.email ?? "", admin, instruments },
    bands: (bands ?? []).map((band) => ({
      id: band.id as string,
      name: band.name as string,
      personal: Boolean(band.is_personal),
    })),
    chosenBand,
    unread: count ?? 0,
    openReports,
    userId: data.user.id,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const shell = await shellProps(locale);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <AstryxTheme>
            <ServiceWorker />
            <TimeZoneCookie />
            <TopEdge />
            {shell?.account && <OfflineSync />}
            {shell?.userId && <NoticesLive userId={shell.userId} />}
            {shell ? (
              <Shell
                account={shell.account}
                bands={shell.bands}
                chosenBand={shell.chosenBand}
                unread={shell.unread}
                openReports={shell.openReports}
              >
                {children}
              </Shell>
            ) : (
              children
            )}
          </AstryxTheme>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
