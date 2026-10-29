# Owner Admin Panel

A platform-administration section at `/admin` for the Amazon Profit SaaS. It is
separate from the customer dashboard and uses a **platform-level** role that is
independent of organization roles (`owner`/`admin`/`analyst` in
`organization_members`, which are tenant-scoped and never grant admin access).

## Architecture

| Concern | Location |
|---|---|
| Migration (roles, suspension, audit, settings) | `packages/db/migrations/0011_platform_admin.sql` |
| Cross-tenant queries | `packages/db/src/admin.ts` (exported from `@amazon-profit/db`) |
| Authorization guard | `apps/web/lib/admin-auth.ts` |
| Audit logging | `apps/web/lib/admin-audit.ts` |
| Platform settings | `apps/web/lib/admin-settings.ts` |
| Health probes | `apps/web/lib/admin-health.ts` |
| Admin pages | `apps/web/app/(admin)/admin/**` |
| Admin API endpoints | `apps/web/app/api/v1/admin/**` |
| Promotion script | `apps/web/scripts/promote-platform-owner.ts` |
| Tests | `apps/web/test/admin.test.ts` |

## Authorization model

Admin access is decided **only** on the server, from:

1. The better-auth session (validated against Postgres via `auth.api.getSession`).
2. `users.platform_role = 'owner'` **or** the user's email appearing in the
   `ADMIN_OWNER_EMAILS` environment allowlist (bootstrap mechanism; server-only).

Every admin page calls `requirePlatformAdminPage()` (in the `(admin)` layout and
again in each page). Every admin API route calls `requirePlatformAdminApi()`
and returns 401 (no session) or 403 (not an owner). Any failure to verify —
missing session, suspended account, DB error — denies access.

There is **no endpoint that writes `platform_role`**. Promotion happens only via
the operator script (requires DB access) or the env allowlist, so ordinary
users can never grant themselves admin.

### Suspension

`POST /api/v1/admin/users/:id/suspend` sets `users.suspended_at` and revokes all
sessions in the same transaction. A Better Auth `session.create.before` hook
blocks suspended users from signing in again (password and social). Guards:

- cannot suspend yourself;
- cannot suspend the last active platform owner.

## Bootstrap (first owner)

1. Apply migration `0011_platform_admin.sql` (see below).
2. Either:
   - **Env allowlist:** set `ADMIN_OWNER_EMAILS=you@example.com` in the server
     environment and restart the web app; sign in as that user and open
     `/admin`. Optionally persist the role afterwards with
     `pnpm --filter @amazon-profit/web admin:promote you@example.com`, then
     remove the env var; or
   - **Direct promotion:** run
     `pnpm --filter @amazon-profit/web admin:promote you@example.com`
     (the user must already exist — sign up first).

## Applying the migration

Migrations are applied manually in this repo (SQL files under
`packages/db/migrations/` are not tracked runners):

```bash
psql "$DATABASE_URL" -f packages/db/migrations/0011_platform_admin.sql
```

All statements are idempotent (`IF NOT EXISTS` / guarded constraints). The test
suite applies it automatically via `packages/db/dist/migrate.js`.

## Platform settings

Only settings with real server-side enforcement exist (`platform_settings`):

| Key | Enforcement |
|---|---|
| `signups_enabled` | Better Auth `hooks.before` rejects `/sign-up/email` when false |
| `sync_retry_enabled` | Admin sync-retry endpoint returns 403 when false |
| `active_user_window_days` | Activity window for the overview "active users" metric |

## Audit log

Sensitive actions (`user.suspend`, `user.reactivate`, `sync.retry`,
`settings.update`, `platform_owner.grant`) are written to `audit_logs` with
actor, target, result and sanitized scalar metadata. Passwords, tokens and
request bodies are never recorded.

## Sync retry safety

`POST /api/v1/admin/sync/retry` accepts exactly one of `syncRunId` or
`amazonAccountId` and reuses the existing `runWorkspaceSync` pipeline (no second
sync system). It refuses when: retries are disabled in settings, the connection
is not `connected`, the connection is a mock (worker-managed), the refresh
token is missing, or a run is already in progress for the account.

## Health checks

- Web — this app serving the request.
- NestJS API — probes the existing `GET /v1/health` (`NESTJS_API_URL`).
- PostgreSQL — `SELECT 1` via the shared pool.
- Redis — RESP `PING` over TCP/TLS (no client dependency).
- Worker — activity-derived from `sync_runs` (no heartbeat endpoint exists);
  reported as unknown when nothing can be inferred.

No connection strings, env values or stack traces are exposed to the browser.

## Billing

No subscription/payment tables exist; the user detail page shows an explicit
"not implemented" note plus read-only history from the existing `invoices`
table. This is the extension point for a future billing integration.
