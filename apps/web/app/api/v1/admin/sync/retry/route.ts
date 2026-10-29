import { NextRequest, NextResponse } from 'next/server';
import { runWorkspaceSync } from '@amazon-profit/sync';
import {
  getSyncRunForRetry,
  getAmazonAccountForRetry,
  hasRecentRunningSync,
} from '@amazon-profit/db';
import { requirePlatformAdminApi } from '@/lib/admin-auth';
import { recordAuditLog } from '@/lib/admin-audit';
import { getPlatformSettings } from '@/lib/admin-settings';

export const dynamic = 'force-dynamic';

const RUNNING_GUARD_MINUTES = 15;
const DEFAULT_BUDGET_MS = 45_000;

function budgetMs(): number {
  const parsed = Number(process.env.SYNC_HTTP_BUDGET_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET_MS;
}

// Admin-triggered sync retry. Reuses the existing runWorkspaceSync pipeline (the
// same path the customer "Sync now" button uses) — no second sync system.
// Duplicate jobs are prevented by refusing when a run is already in progress.
export async function POST(request: NextRequest) {
  const authz = await requirePlatformAdminApi(request.headers);
  if ('response' in authz) return authz.response;
  const { admin } = authz;

  const auditBase = {
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: 'sync.retry' as const,
    entityType: 'sync_run' as string,
    entityId: null as string | null,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
  };

  let body: { syncRunId?: unknown; amazonAccountId?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const syncRunId = typeof body.syncRunId === 'string' ? body.syncRunId.trim() : '';
  const amazonAccountId = typeof body.amazonAccountId === 'string' ? body.amazonAccountId.trim() : '';

  if (!syncRunId === !amazonAccountId) {
    return NextResponse.json({ error: 'Provide exactly one of syncRunId or amazonAccountId.' }, { status: 400 });
  }

  try {
    const settings = await getPlatformSettings();
    if (!settings.syncRetryEnabled) {
      return NextResponse.json({ error: 'Sync retries are disabled in platform settings.' }, { status: 403 });
    }

    let workspaceId: string;
    let accountId: string;

    if (syncRunId) {
      const run = await getSyncRunForRetry(syncRunId);
      if (!run) {
        return NextResponse.json({ error: 'Sync run not found.' }, { status: 404 });
      }
      if (!run.amazon_account_id) {
        return NextResponse.json({ error: 'This sync run is not attached to an Amazon account.' }, { status: 409 });
      }
      workspaceId = run.workspace_id;
      accountId = run.amazon_account_id;
      auditBase.entityId = run.id;
    } else {
      const account = await getAmazonAccountForRetry(amazonAccountId);
      if (!account) {
        return NextResponse.json({ error: 'Amazon account not found.' }, { status: 404 });
      }
      workspaceId = account.workspace_id;
      accountId = account.id;
      auditBase.entityType = 'amazon_account';
      auditBase.entityId = account.id;
    }

    const account = (await getAmazonAccountForRetry(accountId)) ?? null;
    if (!account) {
      return NextResponse.json({ error: 'Amazon account not found.' }, { status: 404 });
    }
    if (account.status !== 'connected') {
      await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'not_connected', status: account.status } });
      return NextResponse.json({ error: `Connection status is "${account.status}" — only connected accounts can be retried.` }, { status: 409 });
    }
    if (account.provider_mode !== 'live') {
      await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'mock_connection' } });
      return NextResponse.json(
        { error: 'Mock connections are synchronized by the background worker queue; retries apply to live SP-API connections.' },
        { status: 422 },
      );
    }
    if (!account.has_refresh_token) {
      await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'missing_refresh_token' } });
      return NextResponse.json({ error: 'This connection has no stored refresh token; reconnect the account first.' }, { status: 409 });
    }
    if (await hasRecentRunningSync(accountId, RUNNING_GUARD_MINUTES)) {
      await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'already_running' } });
      return NextResponse.json({ error: 'A sync for this account is already in progress.' }, { status: 409 });
    }

    const result = await runWorkspaceSync({
      workspaceId,
      accountIds: [accountId],
      trigger: 'manual',
      deadlineMs: budgetMs(),
    });

    const outcome = result.accounts[0];
    await recordAuditLog({
      ...auditBase,
      success: outcome?.status === 'completed' || outcome?.status === 'partial',
      metadata: {
        accountId,
        workspaceId,
        outcome: outcome?.status ?? 'empty',
        records: outcome?.records ?? 0,
        ...(outcome?.error ? { error: outcome.error.slice(0, 300) } : {}),
      },
    });

    if (!outcome) {
      return NextResponse.json({ error: 'No eligible account was synchronized.' }, { status: 409 });
    }
    if (outcome.status === 'failed') {
      return NextResponse.json({ status: outcome.status, error: outcome.error ?? 'Sync failed.' }, { status: 502 });
    }
    return NextResponse.json({
      status: outcome.status,
      records: outcome.records,
      from: outcome.from,
      to: outcome.to,
      ...(outcome.error ? { note: outcome.error } : {}),
    });
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'exception', detail: message } });
    console.error('[admin] sync retry failed:', message);
    return NextResponse.json({ error: 'Sync retry failed.' }, { status: 500 });
  }
}
