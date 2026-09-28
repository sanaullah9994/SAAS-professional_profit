import { createHash } from 'node:crypto';
import { query, transaction } from '@amazon-profit/db';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function ensureWorkspaceForUser(userId: string, email: string): Promise<string | null> {
  const existing = await query<{ id: string }>(
    `SELECT w.id::text AS id
       FROM organization_members m
       JOIN workspaces w ON w.organization_id = m.organization_id
      WHERE m.user_id = $1
      ORDER BY w.created_at, w.id
      LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const suffix = createHash('sha256').update(userId).digest('hex').slice(0, 8);
  const local = email.split('@')[0] ?? '';
  const base = slugify(local) || 'workspace';
  const orgSlug = `u-${base}-${suffix}`;
  const displayName = local.slice(0, 60) || 'My Workspace';

  return transaction(async (c) => {
    const org = await c.query<{ id: string }>(
      `INSERT INTO organizations(name, slug) VALUES($1, $2)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id::text`,
      [displayName, orgSlug],
    );
    let orgId = org.rows[0]?.id;
    if (!orgId) {
      const found = await c.query<{ id: string }>(`SELECT id::text AS id FROM organizations WHERE slug = $1`, [orgSlug]);
      orgId = found.rows[0]?.id;
    }
    if (!orgId) return null;

    await c.query(
      `INSERT INTO organization_members(organization_id, user_id, role) VALUES($1, $2, 'owner')
       ON CONFLICT DO NOTHING`,
      [orgId, userId],
    );

    const workspace = await c.query<{ id: string }>(
      `INSERT INTO workspaces(organization_id, name, slug) VALUES($1, $2, 'default')
       ON CONFLICT (organization_id, slug) DO NOTHING
       RETURNING id::text`,
      [orgId, displayName],
    );
    if (workspace.rows[0]) return workspace.rows[0].id;

    const found = await c.query<{ id: string }>(
      `SELECT id::text AS id FROM workspaces WHERE organization_id = $1 AND slug = 'default'`,
      [orgId],
    );
    return found.rows[0]?.id ?? null;
  });
}
