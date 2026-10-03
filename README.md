# ChartDown App

A web app (desktop and iPad first) where bands write, share and play Nashville Number System charts written in [ChartDown](https://github.com/ChartDown/Language), an open plain-text notation.

The specs in `specs/` are the source of truth. Start with `specs/plan-sdd.md`.

## Layout

| Path            | What it is                                               |
| --------------- | -------------------------------------------------------- |
| `packages/core` | `@chartdown/core`, the ChartDown parser (MIT)            |
| `packages/ui`   | `@chartdown/ui`, shared components                       |
| `apps/web`      | `@chartdown/web`, the Next.js app and landing page       |
| `supabase/`     | Postgres schema, row-level security and server functions |
| `specs/`        | SDD plan, technical plan, design handoff and task list   |
| `assets/`       | Logo and app icons                                       |

## Getting started

Requires Node 22 and pnpm 12.

```sh
pnpm install
pnpm build        # build every package and the app
pnpm dev          # run the web app at http://localhost:3000
pnpm typecheck
pnpm test
pnpm format:check
```

If `pnpm` is not installed, update corepack (`npm install -g corepack@latest`) and run `corepack enable`. The corepack bundled with Node 22.16 cannot run pnpm 12.

## Environments

Production runs at https://chartdown.app on Vercel with the `chartdown-prod` Supabase project; pull request previews and local development use `chartdown-dev`. See [docs/infrastructure.md](docs/infrastructure.md).
