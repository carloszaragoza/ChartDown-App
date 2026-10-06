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
- Build command `pnpm turbo run build` (`apps/web/vercel.json`), so workspace packages such as `chartdown` are built first.
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

## Sign-in (Supabase Auth)

The local stack takes its settings from `supabase/config.toml`. The hosted projects are set in the dashboard, under Authentication. For `chartdown-dev`:

| Setting                 | Where                                               | Value                                                                                                     |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Site URL                | URL Configuration                                   | `https://chart-down-app.vercel.app`                                                                       |
| Redirect URLs           | URL Configuration                                   | `http://localhost:3000/**` and `https://*-carloszaragozas-projects.vercel.app/**` (pull request previews) |
| Confirm email           | Sign In / Providers → Email                         | On                                                                                                        |
| Minimum password length | Sign In / Providers → Email (Password requirements) | 8                                                                                                         |

Emails come from Supabase's built-in sender, a few per hour; enough for development. Production needs a transactional email provider first (T-406).

Sign-in is open in development and previews. In production it opens only with `BETA_OPEN=true` in Vercel's Production environment (T-1203); with any other value, redeploy and it is hidden again.

### Opening the beta in production (`chartdown-prod`, T-1203)

In this order. Nobody but the owner touches production.

1. **Plan:** move `chartdown-prod` to Pro, so it never pauses.
2. **Migrations,** keeping the CLI linked to dev: copy the connection string from the dashboard (Connect → Session pooler) and run
   `npx supabase db push --db-url "postgresql://…"`.
3. **Authentication:**
   - Hooks → **Before User Created** → Postgres function → schema `private`, function `hook_before_user_created` → Enable. Without it, accounts need no invite code.
   - URL Configuration → Site URL `https://www.chartdown.app`; Redirect URLs `https://www.chartdown.app/**`.
   - Sign In / Providers → Email: Confirm email on; minimum password length 8.
   - Emails → SMTP Settings (Resend, T-406): host `smtp.resend.com`, port `465`, user `resend`, password a Resend API key for production only, sender `no-reply@chartdown.app`.
4. **Vercel → Environment Variables → Production:** the Supabase URL and publishable key of `chartdown-prod`, and `BETA_OPEN=true`. Redeploy.
5. **The first admin,** in the dashboard's SQL editor: create a code (`insert into public.invite_codes (note) values ('Owner') returning code;`), sign up with it at www.chartdown.app, then `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '…');`. From then on, codes come from `/admin/invites`.
6. **Check:** the confirmation email arrives within a minute (T-406).

### Invite codes (T-402)

New accounts need an invite code (R-01.7). Supabase Auth checks it with a "before user created" hook, for every sign-in method:

- **Local and CI:** turned on in `supabase/config.toml`.
- **`chartdown-dev` (once, after the migration is pushed):** Authentication → Hooks → **Before User Created** → Postgres function → schema `private`, function `hook_before_user_created` → Enable.

Until the Admin screen exists (T-1102), create and revoke codes in the dashboard's SQL editor:

```sql
-- One person:
insert into public.invite_codes (note) values ('For Ana') returning code;
-- A whole band, up to 8 people:
insert into public.invite_codes (kind, max_uses, note) values ('band', 8, 'Sunday Band') returning code;
-- Revoke:
update public.invite_codes set revoked_at = now() where code = 'ABCD-EFGH';
-- The waitlist:
select email, language, created_at from public.waitlist order by created_at;
```
