import "@chartdown/ui/fonts.css";
import "@chartdown/ui/tokens.css";
import "@chartdown/ui/components.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <ServiceWorker />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
