import { query } from '@amazon-profit/db';
import type { SyncTrigger } from '@amazon-profit/types';
import { getDateRange } from '@amazon-profit/utils';
import { syncLiveAccount } from './live.js';

export type SyncAccountStatus = 'completed' | 'partial' | 'skipped' | 'failed';

export interface SyncAccountResult {
  accountId: string;
  status: SyncAccountStatus;
  records: number;
  from: string;
  to: string;
  nextFrom?: string;
  error?: string;
}

export interface WorkspaceSyncResult {
  workspaceId: string;
  trigger: SyncTrigger;
  incomplete: boolean;
  accounts: SyncAccountResult[];
}

export interface RunWorkspaceSyncOptions {
  workspaceId: string;
  accountIds?: string[];
  trigger: SyncTrigger;
  from?: string;
  to?: string;
  recentDays?: number;
  chunkDays?: number;
  deadlineMs?: number;
  staleRunMinutes?: number;
}

export interface RunAllWorkspacesOptions {
  trigger: SyncTrigger;
  deadlineMs?: number;
  recentDays?: number;
  chunkDays?: number;
  limit?: number;
}

type AccountRow = { id: string; last_synced_at: string | null };

const DAY_MS = 86_400_000;
const CHUNK_SAFETY_MS = 1_500;
const DEFAULT_DEADLINE_MS = 20_000;
const DEFAULT_CHUNK_DAYS = 14;
const DEFAULT_RECENT_DAYS = 2;
const DEFAULT_STALE_RUN_MINUTES = 15;

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function reapStaleRuns(workspaceId: string, staleRunMinutes: number): Promise<void> {
  await query(
    `UPDATE sync_runs
        SET status = 'failed', error_message = 'Sync run was interrupted before completion.', completed_at = now()
      WHERE workspace_id = $1
        AND status = 'running'
        AND started_at < now() - ($2::int * interval '1 minute')`,
    [workspaceId, staleRunMinutes],
  );
}

export async function runWorkspaceSync(options: RunWorkspaceSyncOptions): Promise<WorkspaceSyncResult> {
  const workspaceId = options.workspaceId;
  const trigger = options.trigger;
  const deadline = Date.now() + (options.deadlineMs ?? envNumber('SYNC_DEADLINE_MS', DEFAULT_DEADLINE_MS));
  const chunkDays = Math.max(1, options.chunkDays ?? envNumber('SYNC_CHUNK_DAYS', DEFAULT_CHUNK_DAYS));
  const recentDays = Math.max(1, options.recentDays ?? DEFAULT_RECENT_DAYS);
  const staleRunMinutes = Math.max(1, options.staleRunMinutes ?? envNumber('SYNC_STALE_RUN_MINUTES', DEFAULT_STALE_RUN_MINUTES));

  await reapStaleRuns(workspaceId, staleRunMinutes);

  const params: unknown[] = [workspaceId];
  let sql = `SELECT id::text AS id, last_synced_at
               FROM amazon_accounts
              WHERE workspace_id = $1 AND status = 'connected' AND provider_mode = 'live'
                AND sp_refresh_token_encrypted IS NOT NULL`;
  if (options.accountIds && options.accountIds.length > 0) {
    params.push(options.accountIds);
    sql += ` AND id = ANY($${params.length}::uuid[])`;
  }
  sql += ` ORDER BY connected_at NULLS LAST, id`;
  const accounts = (await query<AccountRow>(sql, params)).rows;

  if (accounts.length === 0) {
    return { workspaceId, trigger, incomplete: false, accounts: [] };
  }

  const initialRange = getDateRange(envNumber('INITIAL_SYNC_DAYS', 90));
  const recentRange = getDateRange(recentDays);
  const neverSynced = accounts.some((account) => !account.last_synced_at);
  const defaultFrom = neverSynced ? initialRange.from : recentRange.from;

  const fromIso = validIso(options.from) ?? defaultFrom;
  const toIso = validIso(options.to) ?? initialRange.to;

  const results: SyncAccountResult[] = [];
  for (const account of accounts) {
    let cursor = fromIso;
    let records = 0;
    let status: SyncAccountStatus = 'completed';
    let nextFrom: string | undefined;
    let error: string | undefined;

    while (Date.parse(cursor) < Date.parse(toIso)) {
      if (Date.now() + CHUNK_SAFETY_MS >= deadline) {
        status = 'partial';
        nextFrom = cursor;
        break;
      }
      const chunkEnd = Math.min(Date.parse(cursor) + chunkDays * DAY_MS, Date.parse(toIso));
      const chunkTo = new Date(chunkEnd).toISOString();
      try {
        const outcome = await syncLiveAccount({
          data: { amazonAccountId: account.id, workspaceId, trigger, from: cursor, to: chunkTo },
        });
        if (outcome.skipped) {
          status = 'skipped';
          error = outcome.skipped;
          nextFrom = cursor;
          break;
        }
        records += outcome.records;
      } catch (err) {
        status = 'failed';
        error = (err instanceof Error ? err.message : String(err)).slice(0, 500);
        break;
      }
      cursor = chunkTo;
    }

    results.push({
      accountId: account.id,
      status,
      records,
      from: fromIso,
      to: toIso,
      ...(nextFrom ? { nextFrom } : {}),
      ...(error ? { error } : {}),
    });
  }

  const incomplete = results.some((result) => result.status === 'partial' || result.status === 'skipped');
  return { workspaceId, trigger, incomplete, accounts: results };
}

export async function runAllWorkspacesSync(options: RunAllWorkspacesOptions): Promise<WorkspaceSyncResult[]> {
  const deadline = Date.now() + (options.deadlineMs ?? envNumber('SYNC_CRON_BUDGET_MS', 25_000));
  const limit = Math.max(1, options.limit ?? envNumber('SYNC_CRON_WORKSPACE_LIMIT', 10));
  const workspaces = (
    await query<{ id: string }>(
      `SELECT DISTINCT workspace_id AS id
         FROM amazon_accounts
        WHERE status = 'connected' AND provider_mode = 'live' AND sp_refresh_token_encrypted IS NOT NULL
        ORDER BY id
        LIMIT $1`,
      [limit],
    )
  ).rows;

  const results: WorkspaceSyncResult[] = [];
  for (const workspace of workspaces) {
    const remaining = deadline - Date.now();
    if (remaining <= CHUNK_SAFETY_MS) break;
    results.push(
      await runWorkspaceSync({
        workspaceId: workspace.id,
        trigger: options.trigger,
        deadlineMs: remaining,
        recentDays: options.recentDays,
        chunkDays: options.chunkDays,
      }),
    );
  }
  return results;
}

function validIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}
