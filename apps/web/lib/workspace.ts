import { headers } from 'next/headers';
import { query } from '@amazon-profit/db';
import { auth } from './auth-server';

// Development-only workspace used when there is no authenticated session
// (e.g. local scripts hitting an API route directly). Never used in production.
const DEV_WORKSPACE_ID = '00000000-0000-0000-0000-000000000302';

// Resolves the workspace for the current request from the existing identity chain:
// better-auth session -> users -> organization_members -> workspaces.
// The client never supplies a workspace id, so there is a single source of truth.
export async function workspaceId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (userId) {
    const { rows } = await query<{ id: string }>(
      `SELECT w.id::text AS id
       FROM workspaces w
       JOIN organization_members m ON m.organization_id = w.organization_id
       WHERE m.user_id = $1
       ORDER BY w.created_at, w.id
       LIMIT 1`,
      [userId],
    );
    if (rows[0]) return rows[0].id;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('No workspace is associated with the authenticated session.');
  }
  return process.env.MOCK_WORKSPACE_ID ?? DEV_WORKSPACE_ID;
}
