import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowWorkspaceProvisioning,
  blockWorkspaceProvisioning,
  createCredentialUser,
  getOverview,
  signIn,
  startTestEnvironment,
  uniqueEmail,
  type Db,
  type TestEnvironment,
} from './helpers';

const PASSWORD = 'WorkspaceTest1!';

let env: TestEnvironment;
let db: Db;
let backfill: typeof import('../lib/backfill');
let workspace: typeof import('../lib/workspace');

async function rowCounts(): Promise<{ members: number; workspaces: number }> {
  const { rows } = await db.query<{ members: number; workspaces: number }>(
    `SELECT (SELECT count(*) FROM organization_members)::int AS members,
            (SELECT count(*) FROM workspaces)::int AS workspaces`,
  );
  const counts = rows[0];
  if (!counts) throw new Error('count query returned no rows');
  return counts;
}

before(
  async () => {
    env = await startTestEnvironment();
    db = await import('@amazon-profit/db');
    backfill = await import('../lib/backfill');
    workspace = await import('../lib/workspace');
    // rate-limit cache only (key = ip + path), so repeated runs of this suite don't 429
    await db.query(`DELETE FROM rate_limits WHERE key LIKE '%sign-in%'`);
  },
  { timeout: 240_000 },
);

after(async () => {
  await env?.stop();
});

test('backfill gives every workspace-less user exactly one workspace and membership, idempotently', async () => {
  const ids = [`backfill-a-${Date.now()}`, `backfill-b-${Date.now()}`];
  for (const id of ids) await createCredentialUser(db, id, uniqueEmail('backfill'), PASSWORD);

  for (const id of ids) {
    const before = await backfill.userWorkspaceState(id);
    assert.deepEqual({ m: before?.memberships, w: before?.workspaces }, { m: 0, w: 0 }, 'fixture starts without a workspace');
  }

  const first = await backfill.backfillWorkspaces();
  assert.equal(first.failed.length, 0, JSON.stringify(first.failed));
  assert.equal(first.ok, true, JSON.stringify(first.state));
  for (const id of ids) {
    const state = await backfill.userWorkspaceState(id);
    assert.deepEqual(
      { email: state?.email.endsWith('@example.com'), m: state?.memberships, w: state?.workspaces },
      { email: true, m: 1, w: 1 },
      'exactly one membership and one workspace after backfill',
    );
  }

  const totals = await rowCounts();
  const second = await backfill.backfillWorkspaces();
  assert.equal(second.candidates, 0, 'no user is left without a workspace');
  assert.equal(second.ok, true);
  assert.deepEqual(await rowCounts(), totals, 'a second run writes no additional rows');
});

test('existing (backfilled) user can load /api/v1/dashboard/overview', async () => {
  const id = `existing-${Date.now()}`;
  const email = uniqueEmail('existing');
  await createCredentialUser(db, id, email, PASSWORD);

  const run = await backfill.backfillWorkspaces();
  assert.equal(run.failed.length, 0, JSON.stringify(run.failed));
  assert.equal((await backfill.userWorkspaceState(id))?.workspaces, 1);

  const cookie = await signIn(env.baseUrl, email, PASSWORD);
  const response = await getOverview(env.baseUrl, cookie);
  assert.equal(response.status, 200, `overview should load, got ${response.status}: ${await response.clone().text()}`);
  const body = (await response.json()) as { summary: Record<string, number>; trend: unknown[]; products: unknown[]; period: number };
  assert.ok(body.summary && typeof body.summary.revenue === 'number', 'summary payload present');
  assert.ok(Array.isArray(body.trend) && Array.isArray(body.products), 'chart payloads present');
  assert.equal(body.period, 7);

  const state = await backfill.userWorkspaceState(id);
  assert.deepEqual({ m: state?.memberships, w: state?.workspaces }, { m: 1, w: 1 }, 'loading the dashboard does not create extra rows');
});

test('a user that predates provisioning is repaired on their first overview request (self-heal)', async () => {
  const id = `selfheal-${Date.now()}`;
  const email = uniqueEmail('selfheal');
  await createCredentialUser(db, id, email, PASSWORD);
  assert.deepEqual(
    { m: (await backfill.userWorkspaceState(id))?.memberships, w: (await backfill.userWorkspaceState(id))?.workspaces },
    { m: 0, w: 0 },
  );

  const cookie = await signIn(env.baseUrl, email, PASSWORD);
  const response = await getOverview(env.baseUrl, cookie);
  assert.equal(response.status, 200, `overview should load, got ${response.status}: ${await response.clone().text()}`);

  const state = await backfill.userWorkspaceState(id);
  assert.deepEqual({ m: state?.memberships, w: state?.workspaces }, { m: 1, w: 1 }, 'self-heal provisions exactly one workspace');
});

test('a genuinely missing workspace does not produce an unhandled 500', async () => {
  const id = `blocked-${Date.now()}`;
  const email = uniqueEmail('blocked');
  await createCredentialUser(db, id, email, PASSWORD);

  await blockWorkspaceProvisioning(db);
  try {
    const cookie = await signIn(env.baseUrl, email, PASSWORD);
    const response = await getOverview(env.baseUrl, cookie);
    assert.notEqual(response.status, 500, 'must not 500 when the workspace cannot be provisioned');
    assert.equal(response.status, 200, `expected an empty-but-successful response, got ${response.status}`);
    const body = (await response.json()) as { summary: { revenue: number }; trend: unknown[] };
    assert.equal(body.summary.revenue, 0, 'serves the empty workspace, not a demo workspace');
    assert.equal(body.trend.length, 0);
    assert.equal((await backfill.userWorkspaceState(id))?.workspaces, 0, 'provisioning really did fail');

    // The production branch must degrade instead of throwing (that throw was the 500).
    const runtimeEnv = process.env as { NODE_ENV?: string };
    const previous = runtimeEnv.NODE_ENV;
    runtimeEnv.NODE_ENV = 'production';
    try {
      assert.equal(await workspace.workspaceId(new Headers({ cookie })), workspace.NO_WORKSPACE_ID, 'authenticated, unprovisionable user');
      assert.equal(await workspace.workspaceId(new Headers()), workspace.NO_WORKSPACE_ID, 'no session at all');
    } finally {
      if (previous === undefined) delete runtimeEnv.NODE_ENV;
      else runtimeEnv.NODE_ENV = previous;
    }
  } finally {
    await allowWorkspaceProvisioning(db);
  }

  const repaired = await backfill.backfillWorkspaces();
  assert.equal(repaired.failed.length, 0, JSON.stringify(repaired.failed));
  const state = await backfill.userWorkspaceState(id);
  assert.deepEqual({ m: state?.memberships, w: state?.workspaces }, { m: 1, w: 1 }, 'backfill repairs the user once provisioning works again');
});
