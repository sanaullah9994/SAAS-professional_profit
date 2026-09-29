import { headers } from 'next/headers';
import { query } from '@amazon-profit/db';
import { auth } from './auth-server';
import { ensureWorkspaceForUser } from './provision';

// Development-only workspace used when there is no authenticated session
// (e.g. local scripts hitting an API route directly). Never used in production.
const DEV_WORKSPACE_ID = '00000000-0000-0000-0000-000000000302';

// Matches no real workspace row (gen_random_uuid() never produces it), so every
// workspace-scoped query returns empty/zeroed rows instead of the request dying
// with an unhandled 500. Used only when a workspace genuinely cannot be resolved.
export const NO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

async function findWorkspaceId(userId: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT w.id::text AS id
       FROM workspaces w
       JOIN organization_members m ON m.organization_id = w.organization_id
      WHERE m.user_id = $1
      ORDER BY w.created_at, w.id
      LIMIT 1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

// Resolves the workspace for the current request from the existing identity chain:
// better-auth session -> users -> organization_members -> workspaces.
// The client never supplies a workspace id, so there is a single source of truth.
// Pass requestHeaders explicitly to resolve outside of a Next.js request scope (tests).
export async function workspaceId(requestHeaders?: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
  const userId = session?.user?.id;
  if (userId) {
    const existing = await findWorkspaceId(userId);
    if (existing) return existing;

    // Self-heal: users created before workspace provisioning existed (or while it
    // was failing) get their workspace on first request instead of a permanent 500.
    try {
      await ensureWorkspaceForUser(userId, session?.user?.email ?? '');
      const provisioned = await findWorkspaceId(userId);
      if (provisioned) return provisioned;
      console.error(`[workspace] provisioning produced no workspace for user ${userId}`);
    } catch (error) {
      console.error('[workspace] provisioning failed:', error instanceof Error ? error.message : error);
    }
    console.error(`[workspace] no workspace for user ${userId}; serving an empty workspace`);
    return NO_WORKSPACE_ID;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[workspace] no authenticated session; serving an empty workspace');
    return NO_WORKSPACE_ID;
  }
  return process.env.MOCK_WORKSPACE_ID ?? DEV_WORKSPACE_ID;
}
