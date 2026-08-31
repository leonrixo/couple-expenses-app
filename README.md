# Couple Expenses

A web app for couples to track shared expenses, split costs automatically, and see a live balance. Built with Next.js 16 (App Router) and Supabase.

**Live app:** https://gastos-pareja-two.vercel.app

## Problem

Splitting expenses between two people gets messy fast: who paid, what percentage each side owes, what's already settled. This app gives a household a shared ledger with configurable split rules (e.g. 60/40 for regular expenses, 50/50 for large ones) and a balance that updates live as transactions are added, without either person needing to do the math by hand.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Supabase (Postgres, Row Level Security, Auth)
- Zod for input validation on every Server Action
- react-hook-form + shadcn/ui
- Vitest (unit/integration) and Playwright (E2E)
- Deployed on Vercel

## Architecture highlights

- **Row Level Security is the only authorization boundary.** Every household-scoped table is protected by RLS policies built on an `is_household_member()` helper (`SECURITY DEFINER` with a fixed `search_path` to prevent function hijacking).
- **Balance is computed on the fly, not cached or stored** — see [ADR 0004](docs/adr/0004-balance-calculado-al-vuelo.md) for the reasoning and tradeoffs.
- Every non-trivial architecture decision is logged as an ADR in [`docs/adr/`](docs/adr/), including the hosting choice and the auth/household data model.
- Run as a real mini-project end to end, not just code: charter, roadmap, backlog and Definition of Done live in [`docs/pm/`](docs/pm/).

## Security

Before shipping, I ran a self-audit of the RLS policies ([`docs/seguridad/2026-08-29-auditoria-seguridad.md`](docs/seguridad/2026-08-29-auditoria-seguridad.md)) and found a real issue: the `UPDATE` policy on household memberships had no `WITH CHECK` clause, which allowed a member to overwrite their partner's membership row. Fixed with an explicit `WITH CHECK` clause plus an immutability trigger — see [migration 0004](supabase/migrations/0004_fix_membership_update_rls.sql).

## Testing

- Unit and integration tests with Vitest, including a dedicated [RLS isolation test](tests/integration/rls-isolation.test.ts) that verifies one household can never read another household's data.
- End-to-end test with Playwright covering the full signup, join household, add expense and balance flow.

```bash
npm test          # unit + integration
npm run test:e2e  # Playwright
```

## Local setup

```bash
npm install
```

Create `.env.local` with your own Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

```bash
npm run dev
```

## What's not here yet

No CI/CD pipeline — tests currently run locally/manually. That's the next thing this project needs before adding more surface area.
