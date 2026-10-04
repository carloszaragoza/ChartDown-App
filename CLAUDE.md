# ChartDown App

ChartDown App is a web app (desktop and iPad first) where bands write, share and play Nashville Number System charts written in **ChartDown**, an open plain-text notation. Every musician sees the same song with the music director's (MD) notes for their own instrument.

## How we work: spec-driven development

- The specs are the source of truth. They live in `specs/`:
  - `specs/plan-sdd.md` – constitution, roles, SPEC-00 to SPEC-09, decisions.
  - `specs/plan-tecnico.md` – architecture, data model, security.
  - `specs/entrega-diseno.md` – design tokens, components, screens, accessibility.
  - `specs/lista-tareas.md` – the MVP task list (T-001 onward) and the definition of done.
  - `specs/chartdown-layers-0.5.md` – the MD layer format (anchors, unplaced notes, text form).
- Never write code for a behavior that is not in a spec. If a rule must change, update the spec first, then the code.
- Work one task at a time, in the order of `specs/lista-tareas.md`, respecting its dependencies.
- Every requirement (R-xx) a task touches gets at least one test with the id in its name, e.g. `R-06.4 a musician never receives notes for another instrument`.

## Stack

- Monorepo: pnpm + Turborepo, TypeScript everywhere.
- `packages/core`: `@chartdown/core`, the ChartDown parser (spec 0.4, from github.com/ChartDown/Language). MIT.
- `packages/ui`: shared components (Bar, Section, MDNote, InstrumentTag, Button, FormStrip, Icon).
- `apps/web`: Next.js (React), installable web app (PWA), English and Spanish.
- `supabase/`: Postgres schema, row-level security policies, server functions.
- Hosting: Vercel (app and landing), Supabase (data, auth), Cloudflare (DNS for chartdown.app).
- Tests: Vitest (core and UI), Playwright (end to end), SQL tests for row-level security.

## Rules that matter

- **Privacy of the MD layer:** a band's MD notes are private to the band. A musician only receives general notes and notes for their own instruments; filter on the server, never only in the UI.
- **Public stays public:** public versions are never physically deleted. Making one private creates a private copy and freezes the public one.
- **Revisions are immutable.** Restoring creates a new revision.
- **No lyrics:** never store or seed full song lyrics. Lyric landmarks are 8 words at most. Test data and examples use original songs only.
- **Design:** use only the tokens from `specs/entrega-diseno.md` (light and dark). Numbers and bar lines are the only full-strength ink. Red = MD and instruments; blue = dynamics and focus. Touch targets at least 44px. WCAG AA contrast.
- **Offline:** fonts and assets are self-hosted so a downloaded set opens with no connection.
- Ask before adding a new dependency, changing the data model beyond the spec, or touching security policies.

## Definition of done

1. Meets every acceptance criterion of its requirements.
2. Tests named with their R-xx ids pass.
3. Lint, type check and tests pass in CI.
4. UI matches the approved design.
5. Any rule change was made in the spec first.
