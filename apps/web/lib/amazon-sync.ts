import { createSignedState } from '@amazon-profit/amazon';
import { runWorkspaceSync } from '@amazon-profit/sync';

export type InitialSyncKick = 'queued' | 'started' | 'failed';

const BACKGROUND_SYNC_PATH = '/.netlify/functions/amazon-sync-initial-background';
const DEFAULT_INLINE_BUDGET_MS = 8_000;
const BACKGROUND_KICK_TIMEOUT_MS = 4_000;

function inlineBudgetMs(): number {
  const parsed = Number(process.env.SYNC_INLINE_BUDGET_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INLINE_BUDGET_MS;
}

function toKickStatus(result: Awaited<ReturnType<typeof runWorkspaceSync>>): InitialSyncKick {
  const accounts = result.accounts;
  if (accounts.length === 0) return 'failed';
  if (accounts.every((account) => account.status === 'skipped')) return 'queued';
  return 'started';
}

async function inlineKick(amazonAccountId: string, workspaceId: string): Promise<InitialSyncKick> {
  try {
    const result = await runWorkspaceSync({
      workspaceId,
      accountIds: [amazonAccountId],
      trigger: 'initial',
      deadlineMs: inlineBudgetMs(),
    });
    return toKickStatus(result);
  } catch (error) {
    console.error('[amazon-sync] inline initial sync failed:', error instanceof Error ? error.message : error);
    return 'failed';
  }
}

export async function kickInitialSync(origin: string, amazonAccountId: string, workspaceId: string): Promise<InitialSyncKick> {
  let token: string | undefined;
  try {
    token = createSignedState({ workspaceId, nonce: amazonAccountId }, process.env.AMAZON_TOKEN_ENCRYPTION_KEY!);
  } catch {
    token = undefined;
  }

  if (token) {
    try {
      const response = await fetch(new URL(BACKGROUND_SYNC_PATH, origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(BACKGROUND_KICK_TIMEOUT_MS),
      });
      if (response.ok || response.status === 202) return 'queued';
    } catch {
      return inlineKick(amazonAccountId, workspaceId);
    }
  }

  return inlineKick(amazonAccountId, workspaceId);
}
