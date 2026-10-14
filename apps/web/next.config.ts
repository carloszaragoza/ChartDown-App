import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@chartdown/ui"],
  // A page seen in the last 30 seconds opens again from the browser's memory (F-005); a server
  // action the person runs refreshes it.
  experimental: { staleTimes: { dynamic: 30 } },
};

export default withNextIntl(nextConfig);
