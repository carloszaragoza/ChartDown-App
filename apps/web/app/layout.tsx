import "@chartdown/ui/fonts.css";
import "@chartdown/ui/tokens.css";
import "@chartdown/ui/components.css";
import "./globals.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { authEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { AppBar, type AppBarProps } from "./_components/AppBar";

export const metadata: Metadata = {
  title: "ChartDown App",
};

/** Who is signed in, for the top bar; nothing while sign-in is hidden (production). */
async function barProps(): Promise<AppBarProps | null> {
  if (!authEnabled()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { account: null, personalSets: null };
  const [{ data: profile }, { data: personal }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", data.user.id).maybeSingle(),
    supabase.from("bands").select("id").eq("personal_owner_id", data.user.id).maybeSingle(),
  ]);
  return {
    account: { name: profile?.name ?? data.user.email ?? "" },
    personalSets: personal ? `/bands/${personal.id}/sets` : null,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, bar] = await Promise.all([getLocale(), barProps()]);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {bar && <AppBar {...bar} />}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
