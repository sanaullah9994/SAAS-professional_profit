# Rewire dashboard pages from hardcoded sample data to real DB data

## Context

The backend (`apps/api`) is entirely real and DB-backed — an audit confirmed no hardcoded/mock business data exists server-side; every controller queries Postgres via `packages/db`. The sample data problem is entirely on the frontend: several `apps/web/app/(dashboard)/*` pages render literal hardcoded arrays instead of fetching from the real API, even though a matching real endpoint already exists.

Only `dashboard`, `profit-calculator`, and `traffic-analytics` are currently wired to real data, using a `fetchX()` helper in `apps/web/lib/api.ts` that calls the API with a hardcoded `DEMO_WORKSPACE_ID` (there's no multi-tenant workspace-selection UI yet).

A separate audit found 12 more dashboard routes are "Coming soon" placeholders with no backend at all (`custom-categories`, `fba-inventory`, `inventory`, `invoices`, `keyword-frequency`, `manual-expenses`, `performance`, `plan-setup`, `products-cogs`, `refer-earn`, `search-term-tags`, `user-permissions`, general `settings`). Those need net-new backend work and are explicitly **out of scope** for this project — decomposed out as a separate future effort.

**Goal:** the 9 pages that already have a real, working backend endpoint but still render hardcoded/mock frontend data should be rewired to pull from the database, matching the pattern the 3 already-wired pages use.

## Scope

**In scope (9 pages):** `alerts`, `cogs`, `connections`, `orders`, `ppc-analytics`, `profit-loss`, `refunds`, `sync-history`, `sku-profitability`.

**Out of scope:** the 11 "coming soon" stub pages, `manual-expenses` (has a backing table `operating_costs` but zero endpoint/query code — needs new backend work), real multi-tenant workspace selection (auth-integrated, separate feature), fixing the gitignored/untracked migration files and the broken `db:migrate` script in `packages/db/package.json` (flagged during audit, unrelated to this work).

## Current state per page

| Page | Current source | Real endpoint to use |
|---|---|---|
| `alerts` | inline hardcoded `rows` (Critical/Warning/Info) | `GET /v1/alerts` |
| `cogs` | inline hardcoded `rows` (2 SKU/cost rows) | `GET /v1/cogs` |
| `connections` | inline hardcoded `rows`, labeled "Mock" | `GET /v1/amazon/connections` |
| `orders` | inline hardcoded `rows` (2 fake order IDs) | `GET /v1/orders` |
| `ppc-analytics` | inline hardcoded `rows` (3 campaign rows) | `GET /v1/ppc/summary` |
| `profit-loss` | inline hardcoded `rows` mirroring `lib/mock.ts`'s numbers | `GET /v1/profit/p-and-l` |
| `refunds` | inline hardcoded `rows` (2 fake refunds) | `GET /v1/refunds` |
| `sync-history` | inline hardcoded `rows` (2 fake sync runs) | `GET /v1/sync/history` |
| `sku-profitability` | imports `skus` directly from `apps/web/lib/mock.ts` | `GET /v1/profit/skus` |

## Missing seed data

`packages/db/migrations/0002_traffic_and_demo_seed.sql` only seeded `users`, `organizations`, `workspaces`, `amazon_accounts`, `products`, `cogs_history`, `profit_daily`, `traffic_daily`. Rewiring a page to a real query only shows something if the table has rows — these are currently empty for the demo workspace:

- `alerts`
- `orders` / `order_items` (and `amazon_fees` if the orders page shows fee breakdowns)
- `refunds`
- `ad_spend_daily` (backs `ppc-analytics`)
- `sync_runs` (backs `sync-history`)
- `amazon_ad_accounts` (the Ads half of `connections` — only the Seller Central `amazon_accounts` row is currently seeded)

A new migration, `packages/db/migrations/0004_demo_data_seed.sql`, will insert realistic rows into these tables, scoped to the existing demo workspace/account IDs from `0002`. Content should mirror what's currently hardcoded per page (so the demo still looks the same, just DB-sourced), with a bit more volume than the current 2-3 fake rows so tables don't look degenerate (e.g., closer to 10-20 rows where it makes sense, like orders/refunds/sync_runs).

## Approach

No new architecture — extend the pattern already established by `dashboard`, `profit-calculator`, and `traffic-analytics`:

1. **Seed migration** (`0004_demo_data_seed.sql`) — apply to the DB (this repo runs SQL manually against Postgres; see `packages/db/migrations/0001_initial.sql` for style conventions).
2. **Per-page rewiring** (8 pages) — add a `fetchX()` function to `apps/web/lib/api.ts` following the existing `fetchDashboardOverview`/`fetchProfitCalculator`/`fetchTrafficRaw` pattern (`getReal()` helper, `DEMO_WORKSPACE_ID` query param, `cache: 'no-store'`). Convert each `page.tsx` to an async Server Component that calls it, delete the inline hardcoded `rows` array, and map the real response fields into the existing table UI (column shapes may need small adjustments where the real API response differs from the current fake columns).
3. **`sku-profitability`** — swap the direct `lib/mock.ts` import for a new `fetchSkuProfitability()` calling `/v1/profit/skus`.
4. **Error/empty handling** — each page distinguishes: real query returned zero rows → "No data yet" message; fetch failed (API down/error) → "Couldn't load data" message. This matches the two-state error handling pattern already used elsewhere in the app (e.g., the login form's distinct error messages).
5. **Cleanup** — once `sku-profitability` no longer imports it, delete `apps/web/lib/mock.ts` and the unused `overviewData()`/`skuData()` functions in `apps/web/lib/api.ts` (already dead code — confirmed zero callers anywhere in `app/`).

## Verification

1. Apply `0004_demo_data_seed.sql` to the local dev database.
2. Load each of the 9 pages in the browser; confirm real seeded rows render (not the old fake data).
3. Temporarily stop the API (or point `NEXT_PUBLIC_API_URL` at a bad port) and reload a page to confirm the "Couldn't load data" error state renders correctly.
4. `grep -r "lib/mock" apps/web` returns no results once cleanup is done.
5. `pnpm --filter @amazon-profit/web typecheck` (or equivalent `tsc --noEmit`) passes with no new errors.
