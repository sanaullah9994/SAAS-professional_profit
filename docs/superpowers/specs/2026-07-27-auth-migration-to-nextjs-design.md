# Auth migration: NestJS/Render → Next.js API routes on Netlify

## Context

The web app (`apps/web`) deploys to Netlify at `profitspiloted.netlify.app`. Auth
(email/password, Google OAuth, email verification, password reset, check-email,
set-password) currently lives in the NestJS API (`apps/api`), deployed separately
(e.g. Render). This means Google OAuth — and every other auth flow — depends on a
second, separately-hosted backend server staying up.

The user wants to stop depending on Render specifically for auth/Google OAuth.
Better-auth's first-class integration target is Next.js Route Handlers, so moving
auth into `apps/web` is not a workaround — it's the more native deployment shape
for the library already in use. This also collapses the current cross-origin setup
(`credentials: 'include'`, `trustedOrigins`, `baseURL.allowedHosts`) into same-origin
requests, removing a whole class of CORS/cookie-domain failure modes that this repo
has already hit once this session (the `:4000` wrong-origin redirect bug).

**Scope confirmed with the user: auth only.** The rest of the NestJS API
(`dashboard`, `profit`, `amazon`, `sync`, `cogs`, `data`, `traffic` controllers)
stays on NestJS/Render untouched. A full backend migration (eliminating Render
entirely) was considered and explicitly rejected as out of scope — it would also
require replacing the BullMQ/Redis sync queue with something serverless-compatible,
which is a much larger, separate effort.

## Why this is safe to do in one cutover

Every existing NestJS controller (`DashboardController`, `ProfitController`,
`AmazonController`, `CogsController`, `SyncController`, `TrafficController`,
`DataController`) is already decorated `@OptionalAuth()` and resolves a hardcoded
demo workspace ID rather than a real user session — none of them read `req.session`.
The only NestJS code that does real session-gated auth today is
`AuthExtraController.setPassword`, which is itself in scope to move. There is no
cross-domain session-sharing problem to solve: nothing on the NestJS side needs to
keep validating sessions after auth moves.

## Architecture

Better-auth's server config moves from `apps/api/src/auth/auth.ts` into
`apps/web/lib/auth-server.ts`, mounted via a Next.js Route Handler catch-all at
`apps/web/app/api/auth/[...all]/route.ts` using better-auth's `toNextJsHandler`.
`authClient` (`apps/web/lib/auth-client.ts`) drops its `baseURL` — same-origin now.

## Components

**Created (in `apps/web`):**
- `lib/auth-server.ts` — the `betterAuth({...})` config, ported from
  `apps/api/src/auth/auth.ts`, with two changes: `rateLimit.storage: 'database'`
  (was `'memory'` — see Rate limiting below), and hooks reimplemented natively
  (see Hooks below).
- `app/api/auth/[...all]/route.ts` — `export const { GET, POST } = toNextJsHandler(auth)`.
- `app/api/v1/auth/check-email/route.ts` — ports `AuthExtraController.checkEmail`
  (plain SQL against `users`/`auth_accounts` via `@amazon-profit/db`, trivial port).
- `app/api/v1/auth/set-password/route.ts` — ports `AuthExtraController.setPassword`,
  calling `auth.api.setPassword` directly instead of proxying over HTTP to NestJS.

**Modified:**
- `lib/auth-client.ts` — remove `baseURL`.
- `lib/api.ts` — `checkEmail()` calls the same-origin `/api/v1/auth/check-email`
  (relative path, no `NEXT_PUBLIC_API_URL`).
- `components/auth/account-security.tsx` — `set-password` fetch becomes a relative
  path.
- `middleware.ts` — no functional change required; it already reads the session
  cookie directly via `getSessionCookie` from `better-auth/cookies`. This becomes
  more correct after the move, since the cookie is now set by the same origin it's
  read from (today it technically works cross-domain via `SameSite=None`).
- `package.json` (web) — confirm `better-auth` is present as a direct dependency
  (currently pulled in via `auth-client.ts`'s `better-auth/react` import); no other
  new dependencies expected since `@amazon-profit/db` is already a workspace
  package importable from `apps/web`.

**Deleted:** `apps/api/src/auth/auth.ts`, `apps/api/src/auth/auth-extra.controller.ts`,
`apps/api/src/auth/auth-hooks.service.ts`; the `AuthModule.forRoot(...)`
registration and its imports in `apps/api/src/app.module.ts`; the
`@thallesp/nestjs-better-auth` dependency from `apps/api/package.json`. Confirmed
outright deletion (not a temporary fallback) per user decision — nothing on the
NestJS side depends on real session auth today, so there's no transition period to
bridge.

## Hooks (password strength enforcement)

`AuthHooksService`'s three `@BeforeHook` methods (`/sign-up/email`,
`/reset-password`, `/change-password`) are NestJS-DI-specific
(`@thallesp/nestjs-better-auth`'s `@Hook()`/`@BeforeHook()` decorators) and have no
equivalent outside that framework. They're reimplemented in `lib/auth-server.ts`
using better-auth's native `hooks.before` with `createAuthMiddleware`, matching on
`ctx.path` against the same three paths and reusing the existing
`passwordRequirementError()` pure function (moved to a shared location importable
from both the server hook and the client-side `PasswordRequirements` component, so
the character-class rules stay defined once).

## Rate limiting

Netlify serverless functions are short-lived and not guaranteed to share memory
between invocations, unlike the current persistent NestJS server process. The
existing `rateLimit.storage: 'memory'` config would silently stop actually limiting
anything post-migration. Per user decision, this changes to
`rateLimit.storage: 'database'` (better-auth persists counters in Postgres),
preserving the existing `customRules` for `/sign-in/email`, `/sign-up/email`,
`/forgot-password`, `/reset-password` unchanged.

## External configuration (manual, outside this repo)

Not something Claude can change directly — the user needs to make these changes:

- **Google Cloud Console**: add `https://profitspiloted.netlify.app/api/auth/callback/google`
  to Authorized redirect URIs. The existing `localhost:4000` one can be removed once
  local dev also points at `:3000`; the pattern stays the same, just a new host.
- **Netlify site env vars**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://profitspiloted.netlify.app`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`,
  `REQUIRE_EMAIL_VERIFICATION` — these currently only exist in `apps/api`'s
  environment and need to be added to the Netlify (`apps/web`) deployment.
- `TRUSTED_ORIGINS` / `baseURL.allowedHosts` simplify since there is now only one
  origin serving both the app and its auth routes.

## Known risk (not blocking)

Netlify's serverless function model can hit the same cold-start Postgres
connection-storm pattern already diagnosed and fixed for the dashboard this
session (concurrent requests against a cold `pg.Pool` connection to Neon). The
existing `idleTimeoutMillis` / `pool.on('error')` / retry-once logic in
`packages/db/src/index.ts` already covers this — no new infrastructure needed, but
worth expecting an occasional retry-logged request in the first days after cutover
rather than treating it as a regression.

## Local development after migration

Local dev auth moves from `localhost:4000` (NestJS) to `localhost:3000`
(Next.js), matching production exactly. This directly eliminates the class of bug
already hit and fixed this session (relative vs. absolute `callbackURL`, wrong-origin
redirects to `:4000`) by removing the dev-time origin mismatch entirely — dev and
prod now share one auth backend shape, not two.

## Testing / verification

- `npx tsc --noEmit` on `apps/web` and `apps/api` after the move (`apps/api` should
  no longer reference `@thallesp/nestjs-better-auth` at all).
- Manually re-walk every auth flow already hardened this session, entirely against
  `localhost:3000` (no `:4000` involved at all once cutover is complete):
  - email sign-up → verify → sign-in
  - Google sign-in for a brand-new user
  - Google sign-in for an existing email/password user (account linking)
  - forgot password → reset password
  - a Google-only user attempting traditional email/password sign-in (should be
    pointed at "forgot password" to set one)
  - set-password from Settings for a Google-only user
  - sign-in rate limiting still triggers after 5 attempts (verifies `database`
    storage actually persists counters)
- Only after local verification passes: update Google Cloud Console and Netlify env
  vars, deploy, and re-walk the same flows against the live Netlify URL.

## Out of scope

- Migrating `dashboard`, `profit`, `amazon`, `sync`, `cogs`, `data`, `traffic`
  controllers off NestJS.
- Replacing the BullMQ/Redis sync queue.
- Any change to real multi-tenant workspace resolution (the demo workspace ID
  hardcoding is untouched by this migration).
