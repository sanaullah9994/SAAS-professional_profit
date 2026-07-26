# Migrate data controllers to Next.js API routes

## Context

Following the auth migration earlier this session (NestJS/Render → Next.js API
routes), the user asked whether the rest of the NestJS API (`apps/api`) should
move too. After investigation, six controllers — `Dashboard`, `Profit`, `Traffic`,
`Amazon`, `Cogs`, `Data` — turned out to be safe to move: all `@OptionalAuth()`
with no real session dependency, all thin wrappers around `@amazon-profit/db`
functions. `Sync` stays on NestJS because it depends on BullMQ + Redis, a
persistent-connection pattern that doesn't fit serverless functions.

**Scope confirmed with the user:**
- Backend routes only — no new frontend wiring for pages that don't already fetch
  real data (Orders, Refunds, Alerts, COGS, Connections, PPC Analytics, Profit &
  Loss, and SKU Profitability's table all stay exactly as hardcoded as they are
  today; only their eventual real-data wiring was explicitly deferred, per the
  still-unimplemented `docs/superpowers/specs/2026-07-25-dashboard-real-data-design.md`).
- Once ported, the NestJS versions of these six controllers are deleted outright
  (same "single source of truth" decision made for auth) — `apps/api` shrinks
  down to just `Health` and `Sync`.
- Dead code cleanup in `apps/web/lib/api.ts` (`overviewData`/`skuData`, unused
  since `dashboard-overview.tsx` was wired to `fetchDashboardOverview`) happens as
  part of this work since the file is already being touched.

## Why this is safe

Confirmed via direct code reading (not assumption): `DashboardController`,
`ProfitController`, `TrafficController`, `AmazonController`, `CogsController`,
`DataController` are all `@Controller(...) @OptionalAuth()` with no code path
reading `req.session`, resolving a hardcoded workspace ID via
`workspaceId()` (`apps/api/src/common/workspace.ts`) instead. This is the same
property that made the auth-only migration safe to do in one cutover — no
cross-domain session-sharing problem, because there was never any real
session-based authorization on these routes to begin with.

Only three frontend components currently call any of these endpoints for real
data: `dashboard-overview.tsx`, `profit-calculator.tsx`, `traffic-analytics.tsx`
(all via `apps/web/lib/api.ts`'s `getReal()` helper), plus one static link
(`sku-profitability/page.tsx`'s CSV export `<a href>`). Every other "data" page
under `app/(dashboard)/` — Orders, Refunds, Alerts, COGS, Connections, PPC
Analytics, Profit & Loss — was found to be 100% hardcoded arrays with zero fetch
calls, confirmed by grepping every page file for `fetch(`/`from '@/lib/api'`.
Porting their backend controllers changes nothing visible for those pages; that's
expected and intentional given the scope decision above.

## Architecture

Route Handlers are placed under `apps/web/app/api/v1/...`, matching the
convention already established by the auth migration (`/api/auth/...`,
`/api/v1/auth/...`) rather than trying to preserve the exact path-less `/v1/...`
URLs NestJS used. This means the existing real call sites need their path prefix
updated from `/v1/...` to `/api/v1/...` — a small, contained change (4 lines in
`lib/api.ts`, 1 line in `sku-profitability/page.tsx`), not a structural one.

## Components

**Created (in `apps/web`):**
- `lib/workspace.ts` — ports `workspaceId(value?: string): string` from
  `apps/api/src/common/workspace.ts` verbatim (one-line pure function), same
  pattern as `lib/password-rules.ts` from the auth migration.
- `app/api/v1/dashboard/overview/route.ts` — ports `DashboardController.overview`.
- `app/api/v1/profit/p-and-l/route.ts`, `profit/skus/route.ts`,
  `profit/calculator/route.ts` — port `ProfitController`'s three JSON endpoints.
- `app/api/v1/profit/skus.csv/route.ts` — ports the CSV export. Express's
  `res.type('text/csv').attachment(...).send(...)` becomes a native `Response`
  with `Content-Type: text/csv` and
  `Content-Disposition: attachment; filename="sku-profitability.csv"` headers.
  Same CSV-cell-escaping logic (quote-wrap, double-up embedded quotes).
- `app/api/v1/traffic/raw/route.ts` — ports `TrafficController.raw`.
- `app/api/v1/amazon/connections/route.ts` (GET),
  `app/api/v1/amazon/connections/seller-central/mock/route.ts` (POST),
  `app/api/v1/amazon/connections/ads/mock/route.ts` (POST) — port
  `AmazonController`'s three endpoints; straightforward DB reads/inserts, no
  external side effects.
- `app/api/v1/cogs/route.ts` (GET list, POST save),
  `app/api/v1/cogs/upload/route.ts` (POST) — port `CogsController`. Upload swaps
  `multer`'s `FileInterceptor`/`UploadedFile` for the Web-standard
  `await req.formData()` → `File` → `await file.arrayBuffer()`, still parsed with
  `csv-parse/sync` (added to `apps/web`'s dependencies — currently only in
  `apps/api`).
- `app/api/v1/orders/route.ts`, `refunds/route.ts`, `alerts/route.ts`,
  `ppc/summary/route.ts` — port `DataController`'s four endpoints.

**Modified:**
- `apps/web/lib/api.ts` — `getReal()` call sites change from `/v1/...` to
  `/api/v1/...`; `overviewData`, `skuData`, and the now-unused `safe()` helper and
  `./mock` import are deleted (confirmed unused — nothing imports them).
- `apps/web/app/(dashboard)/sku-profitability/page.tsx` — CSV export link changes
  from `` `${process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000'}/v1/profit/skus.csv` ``
  to `/api/v1/profit/skus.csv`. This also fixes a live bug: that hardcoded
  `localhost:4000` fallback was never updated when the rest of the app moved to
  the empty-string same-origin fallback, so the link has been silently broken in
  any deployed environment without `NEXT_PUBLIC_API_URL` explicitly set.
- `apps/web/package.json` — add `csv-parse` dependency.

**Deleted (from `apps/api`):** `src/dashboard/`, `src/profit/`, `src/traffic/`,
`src/amazon/`, `src/cogs/`, `src/routes/` (the `DataController` file), and their
registrations in `app.module.ts`. `HealthController` and `SyncController`/
`SyncQueueService` (and their supporting files: `src/queue/redis.ts`) are the only
things left in `apps/api` afterward.

## Data flow / error handling

Unchanged from today: `getReal()` in `lib/api.ts` already wraps every real fetch
in try/catch, returning `null` on any failure, which `dashboard-overview.tsx`
already renders as a "Couldn't load dashboard data — Try again" banner (fixed
earlier this session). No new error-handling design needed — the frontend
contract (URL path aside) doesn't change.

## Testing / verification

- `npx tsc --noEmit` on `apps/web` and `apps/api` after the move.
- `curl` each new route directly (matching the auth migration's verification
  style — this repo has no test runner), comparing JSON shape against what the
  NestJS equivalent returned before deletion where practical.
- Confirm `dashboard-overview.tsx`, `profit-calculator.tsx`, `traffic-analytics.tsx`
  still render real data in the browser at `localhost:3000` after the path change.
- Confirm the SKU Profitability page's "Export CSV" link downloads a real CSV
  from the new same-origin path.
- Confirm `apps/api` still boots cleanly (`curl localhost:4000/v1/health`) with
  the six controllers removed, and that Sync (`POST /v1/sync`,
  `GET /v1/sync/history`) still works unchanged.

## Out of scope

- Any new frontend data-fetching for Orders, Refunds, Alerts, COGS, Connections,
  PPC Analytics, Profit & Loss, or SKU Profitability's table — these stay
  hardcoded. Revisiting this is the unimplemented
  `2026-07-25-dashboard-real-data-design.md` spec, a separate piece of work.
- Migrating `Sync` off NestJS/BullMQ/Redis.
- Deleting `apps/api` entirely — it keeps running for `Health` + `Sync`.
