import { NextRequest, NextResponse } from 'next/server';
import { runWorkspaceSync, type WorkspaceSyncResult } from '@amazon-profit/sync';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const DEFAULT_HTTP_BUDGET_MS = 45_000;

type SyncRequestBody = {
  from?: string;
  to?: string;
  accountIds?: string[];
  recentDays?: number;
  chunkDays?: number;
};

function httpBudgetMs(): number {
  const parsed = Number(process.env.SYNC_HTTP_BUDGET_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HTTP_BUDGET_MS;
}

function aggregateStatus(result: WorkspaceSyncResult): string {
  const statuses = result.accounts.map((account) => account.status);
  if (statuses.length === 0) return 'empty';
  if (statuses.every((status) => status === 'completed')) return 'completed';
  if (statuses.some((status) => status === 'partial' || status === 'skipped')) return 'partial';
  return 'failed';
}

function bodyFor(result: WorkspaceSyncResult) {
  return {
    status: aggregateStatus(result),
    incomplete: result.incomplete,
    accounts: result.accounts,
    nextFrom: result.accounts.find((account) => account.nextFrom)?.nextFrom ?? null,
    fees: 'not_synced' as const,
  };
}

export async function POST(req: NextRequest) {
  const workspace = await workspaceId();

  let body: SyncRequestBody = {};
  try {
    body = (await req.json()) as SyncRequestBody;
  } catch {
    body = {};
  }

  try {
    const result = await runWorkspaceSync({
      workspaceId: workspace,
      trigger: 'manual',
      ...(Array.isArray(body.accountIds) && body.accountIds.length > 0 ? { accountIds: body.accountIds } : {}),
      ...(body.from ? { from: body.from } : {}),
      ...(body.to ? { to: body.to } : {}),
      ...(body.recentDays ? { recentDays: body.recentDays } : {}),
      ...(body.chunkDays ? { chunkDays: body.chunkDays } : {}),
      deadlineMs: httpBudgetMs(),
    });
    return NextResponse.json(bodyFor(result));
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    return NextResponse.json(
      { status: 'failed', incomplete: true, accounts: [], nextFrom: null, fees: 'not_synced', error: message },
      { status: 500 },
    );
  }
}
