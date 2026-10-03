# Infrastructure

Hosting from Technical Plan 12.4: Vercel for the app and landing page, Supabase for data and auth, Cloudflare for DNS. No secrets in this file; keys live only in Vercel and in local `.env.local` files.

## Environments

| Environment | Vercel target           | Supabase project | Ref                    | Region           |
| ----------- | ----------------------- | ---------------- | ---------------------- | ---------------- |
| Production  | Production (`main`)     | `chartdown-prod` | `nkuvzazyfcqbaefthykq` | us-east-2 (Ohio) |
| Preview     | Preview (pull requests) | `chartdown-dev`  | `czxcueqmohzzrjoflmrm` | us-east-2 (Ohio) |
| Local       | Development             | `chartdown-dev`  | `czxcueqmohzzrjoflmrm` | us-east-2 (Ohio) |

Both Supabase projects are on the free plan. Free projects pause after a week without activity; move `chartdown-prod` to Pro before the beta (T-1203).

## Vercel

- Project `chart-down-app`, connected to `github.com/carloszaragoza/ChartDown-App`.
- Root directory `apps/web`, framework Next.js, region `iad1`.
- Build command `pnpm turbo run build` (`apps/web/vercel.json`), so workspace packages such as `@chartdown/core` are built first.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, set per target to the Supabase project above. Only the publishable key; the secret key is added when a task needs it, as a sensitive variable.

## Domain and DNS (Cloudflare)

`chartdown.app` uses Cloudflare nameservers. Records point to Vercel with the proxy off (DNS only), so Vercel issues the certificates.

| Name                | Type  | Target                                          |
| ------------------- | ----- | ----------------------------------------------- |
| `chartdown.app`     | A     | `76.76.21.21`                                   |
| `www.chartdown.app` | CNAME | the value Vercel shows under Settings → Domains |

`chartdown.app` redirects (308) to `www.chartdown.app`, which serves the app.

## Local setup

```sh
cd apps/web
npx vercel link --project chart-down-app   # once
npx vercel env pull                        # writes .env.local with the Development values
cd ../..
npx supabase link --project-ref czxcueqmohzzrjoflmrm   # asks for the database password
```
