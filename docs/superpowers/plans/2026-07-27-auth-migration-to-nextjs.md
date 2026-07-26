# Auth Migration: NestJS/Render → Next.js API Routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move better-auth (email/password, Google OAuth, email verification, password reset, check-email, set-password) from the NestJS API (`apps/api`) into Next.js API routes (`apps/web`), so the Netlify-deployed web app no longer depends on Render for auth.

**Architecture:** `apps/web/lib/auth-server.ts` holds the `betterAuth({...})` instance, ported from `apps/api/src/auth/auth.ts`. It's mounted at `apps/web/app/api/auth/[...all]/route.ts` via better-auth's `toNextJsHandler`. Two supporting endpoints (`check-email`, `set-password`) move the same way. Every NestJS controller left behind is already `@OptionalAuth()` with no real session dependency, so once auth code is stripped from `apps/api`, that app keeps serving dashboard/profit/sync/cogs/etc. exactly as before — just with no auth surface at all.

**Tech Stack:** better-auth 1.6.23, Next.js 16 App Router Route Handlers, `@amazon-profit/db` (raw `pg` pool), Postgres (Neon).

## Global Constraints

- No test runner exists in this repo (`web`/`api`/`db` all have placeholder `"test": "node -e \"console.log('...tests later')\""` scripts) — verification steps in this plan use `tsc --noEmit` plus manual curl/browser walkthroughs, matching the project's actual existing convention. Do not invent a test framework as part of this work.
- Do not run `git commit` at any step unless the user explicitly asks in the moment — this repo's owner has said not to auto-commit.
- Do not add a "Co-Authored-By: Claude" trailer to any commit in this repo, if one is made.
- `packages/db/migrations/*.sql` is gitignored ("SQL is run manually against the DB now") — write the migration file, but applying it to the live Neon database requires explicit user confirmation before running (this project's convention, established when `0003_auth_indexes.sql` was applied earlier).
- Follow existing code style in this repo: compact, minimal whitespace, no comments except where a non-obvious constraint needs explaining (this matches every existing file touched by this plan).

---

## Task 1: Add the `rate_limits` table migration

Better-auth's `rateLimit.storage: 'database'` mode needs a table it can read/write rate-limit counters into. It hardcodes the logical model name `rateLimit` and expects three fields (`key: string unique`, `count: number`, `lastRequest: number/bigint`), configurable via `modelName`/`fields` — confirmed by reading `@better-auth/core`'s `get-tables.mjs` (rate-limit table definition) and `db/schema/rate-limit.mjs` (zod schema) directly in `node_modules`. This project's existing better-auth-owned tables (`users`, `user_sessions`, `auth_accounts`, `auth_verifications` in `packages/db/migrations/0001_initial.sql`) all use `id text PRIMARY KEY` and snake_case column names — follow that exact pattern.

**Files:**
- Create: `packages/db/migrations/0004_rate_limits.sql`

**Interfaces:**
- Produces: a `rate_limits` table that `apps/web/lib/auth-server.ts` (Task 3) configures via `rateLimit: { modelName: 'rate_limits', fields: { lastRequest: 'last_request' } }`.

- [ ] **Step 1: Write the migration file**

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  count integer NOT NULL,
  last_request bigint NOT NULL
);
```

- [ ] **Step 2: Ask the user before applying it to the live Neon database**

Show them the SQL above and confirm before running it — this is a schema change against production data, matching how `0003_auth_indexes.sql` was handled earlier in this project. If approved, apply it the same way `0003` was applied (direct `psql`/`pg` connection using `DATABASE_URL` from `.env`; do not add a `packages/db` `migrate` script as part of this — that's a pre-existing gap out of scope here).

- [ ] **Step 3: Verify the table exists**

```bash
psql "$DATABASE_URL" -c "\d rate_limits"
```
Expected: shows the 4 columns (`id`, `key`, `count`, `last_request`) with the types above.

---

## Task 2: Extract shared password-strength rules

The signup/reset-password/change-password server-side hooks (currently NestJS `@BeforeHook` methods in `apps/api/src/auth/auth-hooks.service.ts`) duplicate the same character-class regex already defined client-side in `apps/web/components/auth/password-requirements.tsx`. Moving the hook logic into `apps/web` is a chance to make both sides import one source of truth instead of maintaining two copies of the same rules.

**Files:**
- Create: `apps/web/lib/password-rules.ts`
- Modify: `apps/web/components/auth/password-requirements.tsx`

**Interfaces:**
- Produces: `passwordRequirementError(password: unknown): string | null` and the `rules` array, both importable from `@/lib/password-rules`.
- Consumed by: Task 3's `auth-server.ts` hooks, and `password-requirements.tsx`'s existing `PasswordRequirements` component / `passwordMeetsRequirements` export (re-exported from the same file so `apps/web/app/(auth)/login/login-form.tsx` and `apps/web/components/auth/account-security.tsx`, which both import `passwordMeetsRequirements` from `@/components/auth/password-requirements`, need no changes).

- [ ] **Step 1: Create the shared rules module**

```typescript
// apps/web/lib/password-rules.ts
const SPECIAL_CHAR = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export const rules = [
  { label: '8–128 characters', test: (p: string) => p.length >= 8 && p.length <= 128 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => SPECIAL_CHAR.test(p) },
];

export function passwordMeetsRequirements(password: string) {
  return rules.every((r) => r.test(password));
}

export function passwordRequirementError(password: unknown): string | null {
  if (typeof password !== 'string') return null;
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!SPECIAL_CHAR.test(password)) return 'Password must include a special character.';
  return null;
}
```

- [ ] **Step 2: Re-export from the existing client component so no import sites change**

Replace the top of `apps/web/components/auth/password-requirements.tsx` (currently lines 1-17):

```typescript
'use client';
import { Check, X } from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { rules, passwordMeetsRequirements } from '@/lib/password-rules';

export { rules, passwordMeetsRequirements };
```

(delete the old inline `SPECIAL_CHAR`, `rules`, and `passwordMeetsRequirements` definitions that followed — keep the `PasswordRequirements` component function below unchanged, it still references `rules` which is now imported instead of locally defined.)

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "TS5101\|aka.ms"
```
Expected: no errors.

---

## Task 3: Create `apps/web/lib/auth-server.ts`

Port the `betterAuth({...})` config from `apps/api/src/auth/auth.ts`. Three things change from the original: `rateLimit.storage` becomes `'database'` with the `rate_limits` table mapping (Task 1), the three password-strength hooks are reimplemented using better-auth's native `hooks.before` (there's no NestJS DI here), and `baseURL`/`allowedHosts` swap port `4000` for `3000` since auth now lives inside the web app.

**Files:**
- Create: `apps/web/lib/auth-server.ts`

**Interfaces:**
- Consumes: `pool` from `@amazon-profit/db`; `passwordRequirementError` from `@/lib/password-rules` (Task 2).
- Produces: `export const auth` — a better-auth instance whose `.handler` is used by Task 4's route handler, and whose `.api.setPassword` is used by Task 6.

- [ ] **Step 1: Write the file**

```typescript
// apps/web/lib/auth-server.ts
import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { pool } from '@amazon-profit/db';
import { passwordRequirementError } from './password-rules';

function assertPassword(ctx: { path: string; body?: unknown }, field: string) {
  const body = ctx.body as Record<string, unknown> | undefined;
  const error = passwordRequirementError(body?.[field]);
  if (error) throw new APIError('BAD_REQUEST', { message: error, code: 'PASSWORD_TOO_WEAK' });
}

export const auth = betterAuth({
  baseURL: {
    allowedHosts: ['localhost:3000', '127.0.0.1:3000', 'profitspiloted.netlify.app'],
    fallback: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  },
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET ?? 'development-only-secret-change-this-now',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),

  database: pool,

  hooks: {
    async before(ctx) {
      if (ctx.path === '/sign-up/email') assertPassword(ctx, 'password');
      else if (ctx.path === '/reset-password' || ctx.path === '/change-password') assertPassword(ctx, 'newPassword');
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    storage: 'database',
    modelName: 'rate_limits',
    fields: { lastRequest: 'last_request' },
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forgot-password': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      console.log(`[auth] password reset link for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ user, url }) {
      console.log(`[auth] verification link for ${user.email}: ${url}`);
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    modelName: 'users',
    fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
  },

  session: {
    modelName: 'user_sessions',
    fields: {
      expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at',
      ipAddress: 'ip_address', userAgent: 'user_agent', userId: 'user_id',
    },
  },

  account: {
    modelName: 'auth_accounts',
    accountLinking: { enabled: true, trustedProviders: ['google'] },
    fields: {
      accountId: 'account_id', providerId: 'provider_id', userId: 'user_id',
      accessToken: 'access_token', refreshToken: 'refresh_token', idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at', refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at', updatedAt: 'updated_at',
    },
  },

  verification: {
    modelName: 'auth_verifications',
    fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
  },

  plugins: [nextCookies()],
});
```

`nextCookies()` must be the last plugin in the array — it's better-auth's documented Next.js integration plugin that lets `auth.api.*` calls (Task 6's `set-password` route) set cookies on the response correctly from within a Route Handler.

- [ ] **Step 2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "TS5101\|aka.ms"
```
Expected: no errors. (`ctx.path`/`ctx.body` typing comes through `createAuthMiddleware`'s inferred context — if TypeScript complains about the inline type annotation on `assertPassword`, replace the parameter type with `Parameters<Parameters<typeof createAuthMiddleware>[0]>[0]` rather than the hand-written shape.)

---

## Task 4: Mount the better-auth handler as a Next.js Route Handler

**Files:**
- Create: `apps/web/app/api/auth/[...all]/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth-server` (Task 3).

- [ ] **Step 1: Write the route handler**

```typescript
// apps/web/app/api/auth/[...all]/route.ts
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth-server';

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 2: Start the web dev server and hit the session endpoint directly**

```bash
cd apps/web && pnpm dev
```
In another terminal:
```bash
curl -s http://localhost:3000/api/auth/get-session -i | head -5
```
Expected: `HTTP/1.1 200` (or similar success status) with a JSON body, not a 404 — confirms the catch-all route is wired up and better-auth is responding.

---

## Task 5: Port `check-email` to a Next.js Route Handler

**Files:**
- Create: `apps/web/app/api/v1/auth/check-email/route.ts`

**Interfaces:**
- Consumes: `query` from `@amazon-profit/db`.
- Produces: `GET /api/v1/auth/check-email?email=...` returning `{ exists: boolean; providers: string[] }`, matching the `EmailCheck` type already declared in `apps/web/lib/api.ts:31`.

- [ ] **Step 1: Write the route handler**

```typescript
// apps/web/app/api/v1/auth/check-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ exists: false, providers: [] });
  const normalized = email.trim().toLowerCase();
  const { rows } = await query<{ provider_id: string }>(
    `SELECT aa.provider_id FROM users u JOIN auth_accounts aa ON aa.user_id = u.id WHERE lower(u.email) = $1`,
    [normalized],
  );
  if (rows.length === 0) return NextResponse.json({ exists: false, providers: [] });
  return NextResponse.json({ exists: true, providers: [...new Set(rows.map((r) => r.provider_id))] });
}
```

- [ ] **Step 2: Verify against a known account**

```bash
curl -s "http://localhost:3000/api/v1/auth/check-email?email=hashimumarsyed2005@gmail.com"
```
Expected: `{"exists":true,"providers":["google"]}` (or whatever providers that account actually has) — matches what `apps/api`'s equivalent endpoint returns today; compare against `curl -s "http://localhost:4000/v1/auth/check-email?email=..."` if `apps/api` is still running at this point in the migration.

---

## Task 6: Port `set-password` to a Next.js Route Handler

**Files:**
- Create: `apps/web/app/api/v1/auth/set-password/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth-server` (Task 3); `passwordRequirementError` from `@/lib/password-rules` (Task 2).
- Produces: `POST /api/v1/auth/set-password` with body `{ newPassword: string }`, requiring an authenticated session (unlike `check-email`, this is not `@OptionalAuth()` — it reads the session cookie via `auth.api.setPassword`, which throws if there's no valid session, matching the original NestJS behavior of "no `@OptionalAuth()`/`@AllowAnonymous()`, global guard requires a session by default").

- [ ] **Step 1: Write the route handler**

```typescript
// apps/web/app/api/v1/auth/set-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { passwordRequirementError } from '@/lib/password-rules';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const newPassword = body?.newPassword;
  const error = passwordRequirementError(newPassword);
  if (error) return NextResponse.json({ message: error }, { status: 400 });

  try {
    await auth.api.setPassword({ body: { newPassword }, headers: req.headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not set password';
    return NextResponse.json({ message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify end to end via the browser**

Sign in as a Google-only test account at `http://localhost:3000/login`, go to Settings → Account Security, use "Create a password" (this calls `apps/web/components/auth/account-security.tsx`'s `CreatePasswordCard`, updated in Task 7 to hit the new relative path). Expected: password is created without error, and signing out then signing back in with email+password for that account succeeds.

---

## Task 7: Point web consumers at the same-origin auth routes

**Files:**
- Modify: `apps/web/lib/auth-client.ts`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/auth/account-security.tsx`

**Interfaces:**
- No signature changes — `authClient`, `checkEmail()`, and the Settings page's fetch call all keep the same shapes callers already use (`apps/web/app/(auth)/login/login-form.tsx` and others need zero changes).

- [ ] **Step 1: Drop `baseURL` from the auth client**

Replace `apps/web/lib/auth-client.ts` entirely:

```typescript
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient({ fetchOptions: { credentials: 'include' } });
```

(`credentials: 'include'` is harmless to keep even same-origin; removing it isn't necessary and isn't part of this migration's scope.)

- [ ] **Step 2: Point `checkEmail()` at the relative path**

In `apps/web/lib/api.ts`, change:

```typescript
export async function checkEmail(email:string):Promise<EmailCheck>{
  try{
    const r=await fetch(`${API}/v1/auth/check-email?email=${encodeURIComponent(email)}`,{cache:'no-store'});
    return r.ok?((await r.json()) as EmailCheck):{exists:false,providers:[]};
  }catch{return{exists:false,providers:[]};}
}
```

to:

```typescript
export async function checkEmail(email:string):Promise<EmailCheck>{
  try{
    const r=await fetch(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,{cache:'no-store'});
    return r.ok?((await r.json()) as EmailCheck):{exists:false,providers:[]};
  }catch{return{exists:false,providers:[]};}
}
```

(Leave the `API`/`safe`/`getReal`-based dashboard/profit/traffic calls in this same file untouched — those still hit `apps/api`, out of scope for this migration.)

- [ ] **Step 3: Point the set-password fetch at the relative path**

In `apps/web/components/auth/account-security.tsx`, remove the `const API = process.env.NEXT_PUBLIC_API_URL || '';` line (line 7) and change the fetch call inside `CreatePasswordCard`'s `submit` (currently `` `${API}/v1/auth/set-password` ``) to:

```typescript
const res = await fetch('/api/v1/auth/set-password', {
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "TS5101\|aka.ms"
```
Expected: no errors.

---

## Task 8: Strip auth out of `apps/api`

Every remaining NestJS controller is already `@OptionalAuth()`/`@AllowAnonymous()` with no code path reading a session — confirmed by grepping all seven controllers for session usage and finding none. `AuthModule.forRoot(...)` was also silently responsible for configuring Express's body-parser middleware (Nest's own is disabled via `bodyParser: false` in `main.ts`, specifically so `AuthModule` could parse the raw body only for non-auth routes) — confirmed by reading `@thallesp/nestjs-better-auth`'s source (`resolveBodyParserOptions`, called from `AuthModule.forRoot`). Removing `AuthModule` without restoring Nest's own body parser would silently break JSON body parsing on every remaining POST endpoint (`cogs`, `sync`, etc.) — this task must re-enable it.

**Files:**
- Delete: `apps/api/src/auth/auth.ts`
- Delete: `apps/api/src/auth/auth-extra.controller.ts`
- Delete: `apps/api/src/auth/auth-hooks.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/health/health.controller.ts`
- Modify: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/amazon/amazon.controller.ts`
- Modify: `apps/api/src/cogs/cogs.controller.ts`
- Modify: `apps/api/src/sync/sync.controller.ts`
- Modify: `apps/api/src/traffic/traffic.controller.ts`
- Modify: `apps/api/src/routes/data.controller.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Delete the three auth files**

```bash
rm apps/api/src/auth/auth.ts apps/api/src/auth/auth-extra.controller.ts apps/api/src/auth/auth-hooks.service.ts
rmdir apps/api/src/auth 2>/dev/null || true
```

- [ ] **Step 2: Rewrite `app.module.ts`** to drop the `AuthModule`/`auth`/`AuthExtraController`/`AuthHooksService` wiring:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { DashboardController } from './dashboard/dashboard.controller.js';
import { ProfitController } from './profit/profit.controller.js';
import { AmazonController } from './amazon/amazon.controller.js';
import { SyncController, SyncQueueService } from './sync/sync.controller.js';
import { CogsController } from './cogs/cogs.controller.js';
import { DataController } from './routes/data.controller.js';
import { TrafficController } from './traffic/traffic.controller.js';
@Module({
  imports:[
    ConfigModule.forRoot({isGlobal:true,envFilePath:['../../.env','.env']}),
  ],
  controllers:[HealthController,DashboardController,ProfitController,AmazonController,SyncController,CogsController,DataController,TrafficController],
  providers:[SyncQueueService]
})
export class AppModule{}
```

- [ ] **Step 3: Re-enable Nest's default body parser in `main.ts`**

Replace:
```typescript
const app=await NestFactory.create(AppModule,{bodyParser:false});
```
with:
```typescript
const app=await NestFactory.create(AppModule);
```
(leave every other line in `main.ts` — CORS, `ValidationPipe`, shutdown hooks, `listen(...)` — unchanged.)

- [ ] **Step 4: Strip the now-dead auth decorator from all 7 remaining controllers**

In each file below, delete the `import { OptionalAuth } from '@thallesp/nestjs-better-auth';` (or `AllowAnonymous` for health) line, and delete ` @OptionalAuth()` (or ` @AllowAnonymous()`) from the `@Controller(...)` line:

- `apps/api/src/health/health.controller.ts` — remove `import { AllowAnonymous } from '@thallesp/nestjs-better-auth';` and the `@AllowAnonymous()` decorator.
- `apps/api/src/dashboard/dashboard.controller.ts` — `@Controller('v1/dashboard') @OptionalAuth()` → `@Controller('v1/dashboard')`.
- `apps/api/src/amazon/amazon.controller.ts` — `@Controller('v1/amazon/connections') @OptionalAuth()` → `@Controller('v1/amazon/connections')`.
- `apps/api/src/cogs/cogs.controller.ts` — `@Controller('v1/cogs') @OptionalAuth()` → `@Controller('v1/cogs')`.
- `apps/api/src/sync/sync.controller.ts` — `@Controller('v1/sync') @OptionalAuth()` → `@Controller('v1/sync')`.
- `apps/api/src/traffic/traffic.controller.ts` — `@Controller('v1/traffic') @OptionalAuth()` → `@Controller('v1/traffic')`.
- `apps/api/src/routes/data.controller.ts` — `@Controller('v1') @OptionalAuth()` → `@Controller('v1')`.

- [ ] **Step 5: Remove the now-unused dependencies from `apps/api/package.json`**

Delete these two lines from `dependencies`:
```json
"@thallesp/nestjs-better-auth": "^2.7.0",
"better-auth": "^1.6.23",
```

- [ ] **Step 6: Reinstall and typecheck**

```bash
pnpm install
cd apps/api && npx tsc -p tsconfig.json --noEmit
```
Expected: no errors, and no remaining reference to `@thallesp/nestjs-better-auth` or `better-auth` anywhere under `apps/api/src` (`grep -rn "better-auth" apps/api/src` should return nothing).

- [ ] **Step 7: Confirm the API still boots and serves a non-auth route**

```bash
cd apps/api && pnpm dev
```
In another terminal:
```bash
curl -s http://localhost:4000/v1/health
```
Expected: a successful health-check response (same as before this task), confirming the app boots without `AuthModule` and the body-parser fix didn't break anything.

---

## Task 9: Update `.env.example` and do a full local walkthrough

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update the auth section**

Change:
```
# Auth (better-auth) — apps/api/src/auth/auth.ts
BETTER_AUTH_SECRET=development-only-secret-change-this-now
# Must be the API's own https URL in production — better-auth derives the
# session cookie's `secure` flag from this, so http here means non-secure cookies.
BETTER_AUTH_URL=http://localhost:4000
```
to:
```
# Auth (better-auth) — apps/web/lib/auth-server.ts
BETTER_AUTH_SECRET=development-only-secret-change-this-now
# Must be the web app's own https URL in production — better-auth derives the
# session cookie's `secure` flag from this, so http here means non-secure cookies.
BETTER_AUTH_URL=http://localhost:3000
```
Leave `TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REQUIRE_EMAIL_VERIFICATION` as-is (still correct).

- [ ] **Step 2: Full local walkthrough against `localhost:3000` only**

With `apps/web` running (`apps/api` optional at this point — only needed for the dashboard/profit/etc pages, not auth), re-walk every flow this session already hardened, entirely against port 3000:
1. Email sign-up → check server console for the logged verification link → visit it → confirm auto sign-in.
2. Sign out, sign in with that email+password.
3. Google sign-in for a brand-new Google account.
4. Google sign-in for the existing email/password account from step 1 (account linking — same user, not a duplicate).
5. Forgot password → check console for the logged reset link → reset → sign in with new password.
6. Attempt traditional email/password sign-in for a Google-only account → confirm the "no password set yet, use Google or set a password" messaging still fires (this exercises `checkEmail()` end to end through the new route).
7. From Settings → Account Security, create a password for a Google-only account, then sign in with it.
8. Trigger sign-in rate limiting: 6 rapid failed sign-in attempts for the same account → 6th should be rejected with a 429-style rate-limit response, confirming `storage: 'database'` (Task 1's table) is actually being written to (`SELECT * FROM rate_limits;` should show a row for that key).

- [ ] **Step 3: Only after all of the above pass locally** — tell the user it's ready for the manual, out-of-repo steps: adding the Netlify redirect URI in Google Cloud Console, and setting `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`DATABASE_URL`/`REQUIRE_EMAIL_VERIFICATION`/`TRUSTED_ORIGINS` in Netlify's site environment variables (per the design spec's "External configuration" section) — these cannot be done by Claude.
