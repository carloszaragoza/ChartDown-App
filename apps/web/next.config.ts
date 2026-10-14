import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@chartdown/ui"],
  // A page loaded ahead whole (stand mode's next song, F-006) is kept 60 seconds, not 5 minutes,
  // so a change is never hidden for long. Visited pages are not kept (F-005).
  experimental: { staleTimes: { static: 60 } },
};

export default withNextIntl(nextConfig);
