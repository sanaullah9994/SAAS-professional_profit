import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createCredentialUser, signIn, startTestEnvironment, uniqueEmail, type Db, type TestEnvironment } from './helpers';

const PASSWORD = 'AdminPanelTest1!';
// Read by the dev server at spawn time: exercises the ADMIN_OWNER_EMAILS
// bootstrap allowlist (server-side env only — never writable by users).
const ALLOWLIST_EMAIL = 'allowlisted-owner@example.com';

let env: TestEnvironment;
let db: Db;

async function api(
  path: string,
  options: { method?: string; cookie?: string; body?: unknown } = {},
): Promise<Response> {
  return fetch(`${env.baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    redirect: 'manual',
    signal: AbortSignal.timeout(60_000),
  });
}

async function makeOwner(prefix: string): Promise<{ id: string; email: string; cookie: string }> {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = uniqueEmail(prefix);
  await createCredentialUser(db, id, email, PASSWORD);
  await db.query(`UPDATE users SET platform_role = 'owner' WHERE id = $1`, [id]);
  const cookie = await signIn(env.baseUrl, email, PASSWORD);
  return { id, email, cookie };
}

async function makeUser(prefix: string): Promise<{ id: string; email: string; cookie: string }> {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = uniqueEmail(prefix);
  await createCredentialUser(db, id, email, PASSWORD);
  const cookie = await signIn(env.baseUrl, email, PASSWORD);
  return { id, email, cookie };
}

before(
  async () => {
    process.env.ADMIN_OWNER_EMAILS = ALLOWLIST_EMAIL;
    env = await startTestEnvironment();
    db = await import('@amazon-profit/db');
    // The allowlist grants access by email; the account itself must still exist.
    await createCredentialUser(db, 'allowlisted-owner-fixture', ALLOWLIST_EMAIL, PASSWORD);
  },
  { timeout: 300_000 },
);

after(async () => {
  await env?.stop();
});

beforeEach(async () => {
  // better-auth stores rate limits in the DB; clear so repeated sign-ins in
  // this suite never trip the per-endpoint windows.
  await db.query(`DELETE FROM rate_limits`);
});

test('admin API endpoints reject unauthenticated requests with 401', async () => {
  const anyUserId = '00000000-0000-0000-0000-000000000001';
  const checks = [
    await api(`/api/v1/admin/users/${anyUserId}/suspend`, { method: 'POST', body: {} }),
    await api(`/api/v1/admin/users/${anyUserId}/reactivate`, { method: 'POST', body: {} }),
    await api('/api/v1/admin/sync/retry', { method: 'POST', body: {} }),
    await api('/api/v1/admin/settings', { method: 'PUT', body: { key: 'signups_enabled', value: false } }),
  ];
  for (const response of checks) {
    assert.equal(response.status, 401, `expected 401, got ${response.status}`);
  }
});

test('authenticated non-admins get 403 on every admin endpoint and cannot self-promote', async () => {
  const user = await makeUser('plain');
  const target = await makeUser('victim');

  const responses = [
    await api(`/api/v1/admin/users/${target.id}/suspend`, { method: 'POST', cookie: user.cookie, body: {} }),
    await api(`/api/v1/admin/users/${target.id}/reactivate`, { method: 'POST', cookie: user.cookie, body: {} }),
    await api('/api/v1/admin/sync/retry', { method: 'POST', cookie: user.cookie, body: { amazonAccountId: target.id } }),
    await api('/api/v1/admin/settings', { method: 'PUT', cookie: user.cookie, body: { key: 'signups_enabled', value: false } }),
  ];
  for (const response of responses) {
    assert.equal(response.status, 403, `expected 403, got ${response.status}: ${await response.clone().text()}`);
  }

  const { rows } = await db.query(`SELECT platform_role FROM users WHERE id = $1`, [user.id]);
  assert.equal(rows[0]?.platform_role, 'user', 'no endpoint may grant platform_role to the caller');

  const page = await api('/admin', { cookie: user.cookie });
  assert.ok(page.status === 307 || page.status === 308, `non-admin page access should redirect, got ${page.status}`);
  assert.equal(page.headers.get('location'), '/dashboard');
});

test('suspend flow: sessions revoked, sign-in blocked, audited; reactivate restores access', async () => {
  const owner = await makeOwner('owner');
  const victim = await makeUser('victim');
  // Victim has a live session at suspension time.
  const beforeSuspension = await db.query(`SELECT count(*)::int AS n FROM user_sessions WHERE user_id = $1`, [victim.id]);
  assert.ok((beforeSuspension.rows[0]?.n ?? 0) >= 1, 'victim starts with a session');

  const suspend = await api(`/api/v1/admin/users/${victim.id}/suspend`, {
    method: 'POST',
    cookie: owner.cookie,
    body: { reason: 'automated test' },
  });
  assert.equal(suspend.status, 200, await suspend.clone().text());

  const sessions = await db.query(`SELECT count(*)::int AS n FROM user_sessions WHERE user_id = $1`, [victim.id]);
  assert.equal(sessions.rows[0]?.n, 0, 'all sessions are revoked in the same transaction');

  const userRow = await db.query(`SELECT suspended_at, suspended_reason FROM users WHERE id = $1`, [victim.id]);
  assert.ok(userRow.rows[0]?.suspended_at, 'suspended_at is set');
  assert.equal(userRow.rows[0]?.suspended_reason, 'automated test');

  const audit = await db.query(
    `SELECT action, entity_id, actor_user_id, success, metadata FROM audit_logs WHERE action = 'user.suspend' AND entity_id = $1`,
    [victim.id],
  );
  assert.ok(audit.rows.length >= 1, 'suspension is audited');
  assert.equal(audit.rows[0]?.actor_user_id, owner.id);
  assert.equal(audit.rows[0]?.success, true);

  // Suspended user cannot create a new session.
  await db.query(`DELETE FROM rate_limits`);
  const reSignIn = await fetch(`${env.baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: env.baseUrl },
    body: JSON.stringify({ email: victim.email, password: PASSWORD }),
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(reSignIn.status, 403, 'suspended accounts cannot sign in');

  // Suspension also blocks admin access even if a cookie survived.
  const forbidden = await api('/api/v1/admin/settings', {
    method: 'PUT',
    cookie: victim.cookie,
    body: { key: 'signups_enabled', value: false },
  });
  assert.equal(forbidden.status, 401, 'revoked session no longer authenticates');

  const reactivate = await api(`/api/v1/admin/users/${victim.id}/reactivate`, { method: 'POST', cookie: owner.cookie });
  assert.equal(reactivate.status, 200, await reactivate.clone().text());

  await db.query(`DELETE FROM rate_limits`);
  const restored = await signIn(env.baseUrl, victim.email, PASSWORD);
  assert.ok(restored.includes('better-auth.session_token'), 'reactivated user can sign in again');

  const auditCount = await db.query(
    `SELECT count(*)::int AS n FROM audit_logs WHERE action = 'user.reactivate' AND entity_id = $1 AND success = true`,
    [victim.id],
  );
  assert.ok((auditCount.rows[0]?.n ?? 0) >= 1, 'reactivation is audited');
});

test('suspend protections: self-suspension and last-owner are blocked', async () => {
  const owner = await makeOwner('soleowner');
  const other = await makeUser('other');
  // Earlier tests in this shared database may have created other owners;
  // isolate this scenario to a single active platform owner.
  await db.query(`UPDATE users SET platform_role = 'user' WHERE platform_role = 'owner' AND id <> $1`, [owner.id]);

  const self = await api(`/api/v1/admin/users/${owner.id}/suspend`, { method: 'POST', cookie: owner.cookie, body: {} });
  assert.equal(self.status, 400, 'an owner cannot suspend their own account');

  // The allowlist-granted admin (not a DB owner) cannot suspend the sole DB owner.
  await db.query(`DELETE FROM rate_limits`);
  const allowCookie = await signIn(env.baseUrl, ALLOWLIST_EMAIL, PASSWORD);
  const lastOwner = await api(`/api/v1/admin/users/${owner.id}/suspend`, { method: 'POST', cookie: allowCookie, body: {} });
  assert.equal(lastOwner.status, 403, 'the last platform owner cannot be suspended');
  const body = (await lastOwner.json()) as { error?: string };
  assert.match(body.error ?? '', /last platform owner/i);

  // Allowlist admins do get through the gate (bootstrap path).
  const settingsProbe = await api('/api/v1/admin/settings', {
    method: 'PUT',
    cookie: allowCookie,
    body: { key: 'active_user_window_days', value: 30 },
  });
  assert.equal(settingsProbe.status, 200, 'ADMIN_OWNER_EMAILS grants access without a DB role write');

  // Suspending a non-owner is allowed.
  const suspendOther = await api(`/api/v1/admin/users/${other.id}/suspend`, { method: 'POST', cookie: owner.cookie, body: {} });
  assert.equal(suspendOther.status, 200);
});

test('platform settings are validated and enforced server-side', async () => {
  const owner = await makeOwner('settings');

  const invalid = await api('/api/v1/admin/settings', {
    method: 'PUT',
    cookie: owner.cookie,
    body: { key: 'active_user_window_days', value: 5000 },
  });
  assert.equal(invalid.status, 400, 'out-of-range values are rejected');

  const unknown = await api('/api/v1/admin/settings', {
    method: 'PUT',
    cookie: owner.cookie,
    body: { key: 'drop_everything', value: true },
  });
  assert.equal(unknown.status, 400, 'unknown keys are rejected');

  const disableSignups = await api('/api/v1/admin/settings', {
    method: 'PUT',
    cookie: owner.cookie,
    body: { key: 'signups_enabled', value: false },
  });
  assert.equal(disableSignups.status, 200);

  await db.query(`DELETE FROM rate_limits`);
  const signUp = await fetch(`${env.baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: env.baseUrl },
    body: JSON.stringify({ email: uniqueEmail('blocked'), name: 'Blocked', password: PASSWORD }),
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(signUp.status, 403, 'sign-ups are rejected server-side when disabled');

  const enableSignups = await api('/api/v1/admin/settings', {
    method: 'PUT',
    cookie: owner.cookie,
    body: { key: 'signups_enabled', value: true },
  });
  assert.equal(enableSignups.status, 200);

  await db.query(`DELETE FROM rate_limits`);
  const allowedSignUp = await fetch(`${env.baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: env.baseUrl },
    body: JSON.stringify({ email: uniqueEmail('allowed'), name: 'Allowed', password: PASSWORD }),
    signal: AbortSignal.timeout(30_000),
  });
  assert.ok(allowedSignUp.status < 400, `sign-ups work again when enabled, got ${allowedSignUp.status}`);
});

test('admin sync retry enforces guards and is audited', async () => {
  const owner = await makeOwner('retryowner');

  // Fixture: workspace + org membership + mock and live accounts.
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const mockAccount = randomUUID();
  const liveAccount = randomUUID();
  const suffix = Date.now().toString(36);
  await db.query(`INSERT INTO organizations(id, name, slug) VALUES ($1, 'Retry Org', $2)`, [orgId, `retry-org-${suffix}`]);
  await db.query(`INSERT INTO workspaces(id, organization_id, name, slug) VALUES ($1, $2, 'Retry WS', 'default')`, [workspaceId, orgId]);
  await db.query(
    `INSERT INTO amazon_accounts(id, workspace_id, seller_id, display_name, status, provider_mode)
     VALUES ($1, $2, 'MOCK-SELLER', 'Mock Co', 'connected', 'mock')`,
    [mockAccount, workspaceId],
  );
  await db.query(
    `INSERT INTO amazon_accounts(id, workspace_id, seller_id, display_name, status, provider_mode, sp_refresh_token_encrypted)
     VALUES ($1, $2, 'LIVE-SELLER', 'Live Co', 'connected', 'live', 'placeholder-encrypted')`,
    [liveAccount, workspaceId],
  );

  // Mock connections are worker-managed: rejected with 422, never duplicated.
  const mockRetry = await api('/api/v1/admin/sync/retry', { method: 'POST', cookie: owner.cookie, body: { amazonAccountId: mockAccount } });
  assert.equal(mockRetry.status, 422);

  // Missing refresh token: rejected before any job runs.
  const noToken = await db.query(
    `UPDATE amazon_accounts SET provider_mode = 'live', sp_refresh_token_encrypted = NULL WHERE id = $1`,
    [liveAccount],
  );
  assert.ok(noToken);
  const missingToken = await api('/api/v1/admin/sync/retry', { method: 'POST', cookie: owner.cookie, body: { amazonAccountId: liveAccount } });
  assert.equal(missingToken.status, 409);

  // Concurrent-run guard: an in-progress run blocks a duplicate.
  await db.query(`UPDATE amazon_accounts SET sp_refresh_token_encrypted = 'placeholder-encrypted' WHERE id = $1`, [liveAccount]);
  await db.query(
    `INSERT INTO sync_runs(amazon_account_id, workspace_id, trigger, status, started_at)
     VALUES ($1, $2, 'manual', 'running', now())`,
    [liveAccount, workspaceId],
  );
  const duplicate = await api('/api/v1/admin/sync/retry', { method: 'POST', cookie: owner.cookie, body: { amazonAccountId: liveAccount } });
  assert.equal(duplicate.status, 409, 'a sync already in progress is never duplicated');

  // Both guard refusals are audited as failures.
  const failedAudits = await db.query(
    `SELECT count(*)::int AS n FROM audit_logs WHERE action = 'sync.retry' AND success = false AND entity_id = $1`,
    [liveAccount],
  );
  assert.ok((failedAudits.rows[0]?.n ?? 0) >= 2, 'guard refusals are recorded');

  // Disabled setting short-circuits with 403.
  await api('/api/v1/admin/settings', { method: 'PUT', cookie: owner.cookie, body: { key: 'sync_retry_enabled', value: false } });
  const disabled = await api('/api/v1/admin/sync/retry', { method: 'POST', cookie: owner.cookie, body: { amazonAccountId: liveAccount } });
  assert.equal(disabled.status, 403);
  await api('/api/v1/admin/settings', { method: 'PUT', cookie: owner.cookie, body: { key: 'sync_retry_enabled', value: true } });

  // Exactly one identifier required.
  const both = await api('/api/v1/admin/sync/retry', {
    method: 'POST',
    cookie: owner.cookie,
    body: { amazonAccountId: liveAccount, syncRunId: workspaceId },
  });
  assert.equal(both.status, 400);
});

test('admin pages: anonymous users go to login, owners get 200', async () => {
  const anonymous = await api('/admin');
  assert.ok(anonymous.status === 307 || anonymous.status === 308, `anonymous should redirect, got ${anonymous.status}`);
  assert.match(anonymous.headers.get('location') ?? '', /\/login/);

  const owner = await makeOwner('pageowner');
  const page = await api('/admin', { cookie: owner.cookie });
  assert.equal(page.status, 200, `owner should load the overview, got ${page.status}`);
  const html = await page.text();
  assert.match(html, /Platform Overview/);

  const usersPage = await api('/admin/users', { cookie: owner.cookie });
  assert.equal(usersPage.status, 200);
});
