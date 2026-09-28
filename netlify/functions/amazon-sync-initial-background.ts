import { verifySignedState } from '@amazon-profit/amazon';
import { runWorkspaceSync } from '@amazon-profit/sync';

export const config = { background: true };

const DEFAULT_BACKGROUND_BUDGET_MS = 14 * 60_000;

function backgroundBudgetMs(): number {
  const parsed = Number(process.env.SYNC_BACKGROUND_BUDGET_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BACKGROUND_BUDGET_MS;
}

export default async function handler(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const payload = verifySignedState(body?.token ?? null, process.env.AMAZON_TOKEN_ENCRYPTION_KEY ?? '');
  if (!payload || !payload.nonce) return new Response('invalid sync token', { status: 401 });

  const result = await runWorkspaceSync({
    workspaceId: payload.workspaceId,
    accountIds: [payload.nonce],
    trigger: 'initial',
    deadlineMs: backgroundBudgetMs(),
  });
  return Response.json(result);
}
