// Cross-tenant (platform-level) queries for the owner admin panel.
// These deliberately do NOT take a workspaceId: they are only ever called from
// server code behind the platform-admin guard (apps/web/lib/admin-auth.ts).
// Never import this module from a client component.
import { query, transaction } from './index.js';

const PAGE_SIZE_MAX = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guards uuid-typed query params so malformed ids return empty/404 results
// instead of a Postgres invalid-input-text error.
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function clampPage(page: unknown): number {
  const parsed = Number(page);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.trunc(parsed), 100_000) : 1;
}

export function clampPageSize(pageSize: unknown, fallback = 25): number {
  const parsed = Number(pageSize);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), PAGE_SIZE_MAX);
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  platform_role: 'user' | 'owner';
  suspended_at: Date | null;
  suspended_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getPlatformUserById(id: string): Promise<PlatformUserRow | null> {
  const { rows } = await query<PlatformUserRow>(
    `SELECT id, name, email, email_verified, platform_role, suspended_at, suspended_reason, created_at, updated_at
       FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function countActivePlatformOwners(): Promise<number> {
  const { rows } = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM users WHERE platform_role = 'owner' AND suspended_at IS NULL`,
  );
  return rows[0]?.n ?? 0;
}

// Sets or clears suspension. Session revocation happens in the same transaction
// so a suspended user never keeps a live session. Never touches platform_role.
export async function setPlatformUserSuspended(id: string, suspended: boolean, reason: string | null): Promise<PlatformUserRow | null> {
  return transaction(async (c) => {
    const { rows } = await c.query<PlatformUserRow>(
      `UPDATE users
          SET suspended_at = CASE WHEN $2 THEN now() ELSE NULL END,
              suspended_reason = CASE WHEN $2 THEN $3 ELSE NULL END,
              updated_at = now()
        WHERE id = $1
        RETURNING id, name, email, email_verified, platform_role, suspended_at, suspended_reason, created_at, updated_at`,
      [id, suspended, suspended ? reason : null],
    );
    const user = rows[0] ?? null;
    if (user && suspended) {
      await c.query(`DELETE FROM user_sessions WHERE user_id = $1`, [id]);
    }
    return user;
  });
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  platform_role: 'user' | 'owner';
  suspended_at: Date | null;
  created_at: Date;
  last_session_at: Date | null;
  organization_count: number;
  workspace_count: number;
}

export async function listAdminUsers(options: {
  search?: string;
  status?: 'all' | 'active' | 'suspended';
  page: number;
  pageSize: number;
}): Promise<{ rows: AdminUserListItem[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const search = options.search?.trim();
  if (search) {
    params.push(`%${search}%`);
    where.push(`(u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
  }
  if (options.status === 'active') where.push(`u.suspended_at IS NULL`);
  if (options.status === 'suspended') where.push(`u.suspended_at IS NOT NULL`);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM users u ${whereSql}`,
    params,
  );

  params.push(options.pageSize, (options.page - 1) * options.pageSize);
  const { rows } = await query<AdminUserListItem>(
    `SELECT u.id, u.name, u.email, u.email_verified, u.platform_role, u.suspended_at, u.created_at,
            (SELECT max(s.created_at) FROM user_sessions s WHERE s.user_id = u.id) AS last_session_at,
            (SELECT count(*) FROM organization_members m WHERE m.user_id = u.id)::int AS organization_count,
            (SELECT count(*) FROM organization_members m
               JOIN workspaces w ON w.organization_id = m.organization_id
              WHERE m.user_id = u.id)::int AS workspace_count
       FROM users u
       ${whereSql}
      ORDER BY u.created_at DESC, u.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export interface AdminUserMembership {
  organization_id: string;
  organization_name: string;
  role: string;
  workspace_id: string | null;
  workspace_name: string | null;
  joined_at: Date;
}

export interface AdminUserConnection {
  id: string;
  display_name: string | null;
  seller_id: string;
  marketplace_id: string;
  status: string;
  provider_mode: string;
  last_synced_at: Date | null;
  workspace_name: string;
}

export async function getAdminUserMemberships(userId: string): Promise<AdminUserMembership[]> {
  const { rows } = await query<AdminUserMembership>(
    `SELECT o.id AS organization_id, o.name AS organization_name, m.role,
            w.id::text AS workspace_id, w.name AS workspace_name, m.created_at AS joined_at
       FROM organization_members m
       JOIN organizations o ON o.id = m.organization_id
       LEFT JOIN workspaces w ON w.organization_id = o.id
      WHERE m.user_id = $1
      ORDER BY o.name, w.name`,
    [userId],
  );
  return rows;
}

export async function getAdminUserConnections(userId: string): Promise<AdminUserConnection[]> {
  const { rows } = await query<AdminUserConnection>(
    `SELECT DISTINCT a.id, a.display_name, a.seller_id, a.marketplace_id, a.status, a.provider_mode,
            a.last_synced_at, w.name AS workspace_name
       FROM amazon_accounts a
       JOIN workspaces w ON w.id = a.workspace_id
       JOIN organization_members m ON m.organization_id = w.organization_id
      WHERE m.user_id = $1
      ORDER BY w.name, a.seller_id`,
    [userId],
  );
  return rows;
}

// Read-only billing history. There are no subscription/payment tables yet;
// invoices is a display-only table (migration 0010).
export async function getAdminUserInvoices(
  userId: string,
): Promise<{ id: string; invoice_number: string; status: string; amount_due: number; issue_date: Date; workspace_name: string }[]> {
  const { rows } = await query<{
    id: string;
    invoice_number: string;
    status: string;
    amount_due: number;
    issue_date: Date;
    workspace_name: string;
  }>(
    `SELECT i.id::text AS id, i.invoice_number, i.status, i.amount_due, i.issue_date, w.name AS workspace_name
       FROM invoices i
       JOIN workspaces w ON w.id = i.workspace_id
       JOIN organization_members m ON m.organization_id = w.organization_id
      WHERE m.user_id = $1
      ORDER BY i.issue_date DESC
      LIMIT 10`,
    [userId],
  );
  return rows;
}

export interface AdminWorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  organization_id: string;
  organization_name: string;
  owner_email: string | null;
  member_count: number;
  connection_count: number;
}

export async function listAdminWorkspaces(options: {
  search?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: AdminWorkspaceListItem[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const search = options.search?.trim();
  if (search) {
    params.push(`%${search}%`);
    where.push(`(w.name ILIKE $${params.length} OR w.slug ILIKE $${params.length} OR o.name ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM workspaces w JOIN organizations o ON o.id = w.organization_id ${whereSql}`,
    params,
  );

  params.push(options.pageSize, (options.page - 1) * options.pageSize);
  const { rows } = await query<AdminWorkspaceListItem>(
    `SELECT w.id::text AS id, w.name, w.slug, w.created_at,
            o.id::text AS organization_id, o.name AS organization_name,
            (SELECT u.email FROM organization_members om
               JOIN users u ON u.id = om.user_id
              WHERE om.organization_id = o.id AND om.role = 'owner'
              ORDER BY om.created_at LIMIT 1) AS owner_email,
            (SELECT count(*) FROM organization_members om WHERE om.organization_id = o.id)::int AS member_count,
            (SELECT count(*) FROM amazon_accounts a WHERE a.workspace_id = w.id)::int AS connection_count
       FROM workspaces w
       JOIN organizations o ON o.id = w.organization_id
       ${whereSql}
      ORDER BY w.created_at DESC, w.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export interface AdminWorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  created_at: Date;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
}

export async function getAdminWorkspaceDetail(id: string): Promise<AdminWorkspaceDetail | null> {
  if (!isValidUuid(id)) return null;
  const { rows } = await query<AdminWorkspaceDetail>(
    `SELECT w.id::text AS id, w.name, w.slug, w.currency, w.timezone, w.created_at,
            o.id::text AS organization_id, o.name AS organization_name, o.slug AS organization_slug
       FROM workspaces w
       JOIN organizations o ON o.id = w.organization_id
      WHERE w.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface AdminWorkspaceMember {
  user_id: string;
  email: string;
  name: string;
  role: string;
  suspended_at: Date | null;
  joined_at: Date;
}

export async function getAdminWorkspaceMembers(workspaceId: string): Promise<AdminWorkspaceMember[]> {
  const { rows } = await query<AdminWorkspaceMember>(
    `SELECT m.user_id, u.email, u.name, m.role, u.suspended_at, m.created_at AS joined_at
       FROM organization_members m
       JOIN organizations o ON o.id = m.organization_id
       JOIN workspaces w ON w.organization_id = o.id
       JOIN users u ON u.id = m.user_id
      WHERE w.id = $1
      ORDER BY m.role, u.email`,
    [workspaceId],
  );
  return rows;
}

export interface AdminConnectionRow {
  id: string;
  seller_id: string;
  display_name: string | null;
  marketplace_id: string;
  region: string;
  status: string;
  provider_mode: string;
  connected_at: Date | null;
  last_synced_at: Date | null;
  created_at: Date;
  workspace_id: string;
  workspace_name: string;
  organization_name: string;
  last_run_status: string | null;
  last_run_at: Date | null;
  last_run_error: string | null;
}

export async function listAdminConnections(options: {
  search?: string;
  status?: string;
  workspaceId?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: AdminConnectionRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.workspaceId) {
    if (!isValidUuid(options.workspaceId)) return { rows: [], total: 0 };
    params.push(options.workspaceId);
    where.push(`a.workspace_id = $${params.length}::uuid`);
  }
  const search = options.search?.trim();
  if (search) {
    params.push(`%${search}%`);
    where.push(`(a.seller_id ILIKE $${params.length} OR a.display_name ILIKE $${params.length} OR w.name ILIKE $${params.length})`);
  }
  if (options.status && options.status !== 'all') {
    params.push(options.status);
    where.push(`a.status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await query<{ total: number }>(
    `SELECT count(*)::int AS total
       FROM amazon_accounts a
       JOIN workspaces w ON w.id = a.workspace_id
       JOIN organizations o ON o.id = w.organization_id
       ${whereSql}`,
    params,
  );

  params.push(options.pageSize, (options.page - 1) * options.pageSize);
  const { rows } = await query<AdminConnectionRow>(
    `SELECT a.id::text AS id, a.seller_id, a.display_name, a.marketplace_id, a.region, a.status,
            a.provider_mode, a.connected_at, a.last_synced_at, a.created_at,
            w.id::text AS workspace_id, w.name AS workspace_name, o.name AS organization_name,
            lr.status AS last_run_status, lr.created_at AS last_run_at, lr.error_message AS last_run_error
       FROM amazon_accounts a
       JOIN workspaces w ON w.id = a.workspace_id
       JOIN organizations o ON o.id = w.organization_id
       LEFT JOIN LATERAL (
         SELECT r.status, r.created_at, r.error_message
           FROM sync_runs r
          WHERE r.amazon_account_id = a.id
          ORDER BY r.created_at DESC
          LIMIT 1
       ) lr ON true
       ${whereSql}
      ORDER BY a.created_at DESC, a.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export interface AdminSyncRunRow {
  id: string;
  status: string;
  trigger: string;
  records_processed: number;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  amazon_account_id: string | null;
  account_display_name: string | null;
  account_seller_id: string | null;
  provider_mode: string | null;
  workspace_id: string;
  workspace_name: string;
}

export async function listAdminSyncRuns(options: {
  status?: string;
  search?: string;
  workspaceId?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: AdminSyncRunRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.workspaceId) {
    if (!isValidUuid(options.workspaceId)) return { rows: [], total: 0 };
    params.push(options.workspaceId);
    where.push(`r.workspace_id = $${params.length}::uuid`);
  }
  if (options.status && options.status !== 'all') {
    params.push(options.status);
    where.push(`r.status = $${params.length}`);
  }
  const search = options.search?.trim();
  if (search) {
    params.push(`%${search}%`);
    where.push(`(r.error_message ILIKE $${params.length} OR a.seller_id ILIKE $${params.length} OR a.display_name ILIKE $${params.length} OR w.name ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await query<{ total: number }>(
    `SELECT count(*)::int AS total
       FROM sync_runs r
       LEFT JOIN amazon_accounts a ON a.id = r.amazon_account_id
       JOIN workspaces w ON w.id = r.workspace_id
       ${whereSql}`,
    params,
  );

  params.push(options.pageSize, (options.page - 1) * options.pageSize);
  const { rows } = await query<AdminSyncRunRow>(
    `SELECT r.id::text AS id, r.status, r.trigger, r.records_processed, r.error_message,
            r.started_at, r.completed_at, r.created_at,
            r.amazon_account_id::text AS amazon_account_id,
            a.display_name AS account_display_name, a.seller_id AS account_seller_id, a.provider_mode,
            r.workspace_id::text AS workspace_id, w.name AS workspace_name
       FROM sync_runs r
       LEFT JOIN amazon_accounts a ON a.id = r.amazon_account_id
       JOIN workspaces w ON w.id = r.workspace_id
       ${whereSql}
      ORDER BY r.created_at DESC, r.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export interface SyncRunForRetry {
  id: string;
  workspace_id: string;
  amazon_account_id: string | null;
  status: string;
}

export async function getSyncRunForRetry(id: string): Promise<SyncRunForRetry | null> {
  const { rows } = await query<SyncRunForRetry>(
    `SELECT id::text AS id, workspace_id::text AS workspace_id, amazon_account_id::text AS amazon_account_id, status
       FROM sync_runs WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface AmazonAccountForRetry {
  id: string;
  workspace_id: string;
  status: string;
  provider_mode: string;
  display_name: string | null;
  seller_id: string;
  has_refresh_token: boolean;
}

export async function getAmazonAccountForRetry(id: string): Promise<AmazonAccountForRetry | null> {
  const { rows } = await query<AmazonAccountForRetry>(
    `SELECT id::text AS id, workspace_id::text AS workspace_id, status, provider_mode,
            display_name, seller_id, (sp_refresh_token_encrypted IS NOT NULL) AS has_refresh_token
       FROM amazon_accounts WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function hasRecentRunningSync(accountId: string, withinMinutes: number): Promise<boolean> {
  const { rows } = await query<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM sync_runs
      WHERE amazon_account_id = $1
        AND status = 'running'
        AND started_at > now() - ($2::int * interval '1 minute')`,
    [accountId, withinMinutes],
  );
  return (rows[0]?.n ?? 0) > 0;
}

export interface AdminAuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  success: boolean;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export async function listAdminAuditLogs(options: {
  action?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: AdminAuditLogRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.action && options.action !== 'all') {
    params.push(options.action);
    where.push(`l.action = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM audit_logs l ${whereSql}`,
    params,
  );

  params.push(options.pageSize, (options.page - 1) * options.pageSize);
  const { rows } = await query<AdminAuditLogRow>(
    `SELECT l.id::text AS id, l.actor_user_id, l.actor_email, u.name AS actor_name, l.action,
            l.entity_type, l.entity_id, l.success, l.ip_address, l.metadata, l.created_at
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.actor_user_id
       ${whereSql}
      ORDER BY l.created_at DESC, l.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  platformOwners: number;
  totalWorkspaces: number;
  totalOrganizations: number;
  connections: { status: string; count: number }[];
  syncRuns30d: { status: string; count: number }[];
  recentUsers: { id: string; name: string; email: string; created_at: Date; suspended_at: Date | null }[];
  recentSyncFailures: {
    id: string;
    status: string;
    error_message: string | null;
    created_at: Date;
    workspace_name: string;
    account_seller_id: string | null;
  }[];
  recentAudit: { id: string; action: string; actor_email: string | null; success: boolean; created_at: Date }[];
}

export async function getAdminOverviewStats(activeUserWindowDays: number): Promise<AdminOverviewStats> {
  const windowDays = Math.min(90, Math.max(1, Math.trunc(activeUserWindowDays) || 30));
  const [totals, connections, syncRuns, recentUsers, recentFailures, recentAudit] = await Promise.all([
    query<{
      users: number;
      active: number;
      suspended: number;
      owners: number;
      workspaces: number;
      organizations: number;
    }>(
      `SELECT
         (SELECT count(*) FROM users)::int AS users,
         (SELECT count(DISTINCT s.user_id)
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
           WHERE s.created_at >= now() - ($1::int * interval '1 day')
             AND u.suspended_at IS NULL)::int AS active,
         (SELECT count(*) FROM users WHERE suspended_at IS NOT NULL)::int AS suspended,
         (SELECT count(*) FROM users WHERE platform_role = 'owner' AND suspended_at IS NULL)::int AS owners,
         (SELECT count(*) FROM workspaces)::int AS workspaces,
         (SELECT count(*) FROM organizations)::int AS organizations`,
      [windowDays],
    ),
    query<{ status: string; count: number }>(
      `SELECT status, count(*)::int AS count FROM amazon_accounts GROUP BY status ORDER BY count DESC, status`,
    ),
    query<{ status: string; count: number }>(
      `SELECT status, count(*)::int AS count
         FROM sync_runs
        WHERE created_at >= now() - interval '30 days'
        GROUP BY status ORDER BY count DESC, status`,
    ),
    query<{ id: string; name: string; email: string; created_at: Date; suspended_at: Date | null }>(
      `SELECT id, name, email, created_at, suspended_at
         FROM users ORDER BY created_at DESC LIMIT 8`,
    ),
    query<{
      id: string;
      status: string;
      error_message: string | null;
      created_at: Date;
      workspace_name: string;
      account_seller_id: string | null;
    }>(
      `SELECT r.id::text AS id, r.status, r.error_message, r.created_at,
              w.name AS workspace_name, a.seller_id AS account_seller_id
         FROM sync_runs r
         LEFT JOIN amazon_accounts a ON a.id = r.amazon_account_id
         JOIN workspaces w ON w.id = r.workspace_id
        WHERE r.status = 'failed'
        ORDER BY r.created_at DESC LIMIT 8`,
    ),
    query<{ id: string; action: string; actor_email: string | null; success: boolean; created_at: Date }>(
      `SELECT l.id::text AS id, l.action, l.actor_email, l.success, l.created_at
         FROM audit_logs l ORDER BY l.created_at DESC LIMIT 8`,
    ),
  ]);

  const t = totals.rows[0];
  return {
    totalUsers: t?.users ?? 0,
    activeUsers: t?.active ?? 0,
    suspendedUsers: t?.suspended ?? 0,
    platformOwners: t?.owners ?? 0,
    totalWorkspaces: t?.workspaces ?? 0,
    totalOrganizations: t?.organizations ?? 0,
    connections: connections.rows,
    syncRuns30d: syncRuns.rows,
    recentUsers: recentUsers.rows,
    recentSyncFailures: recentFailures.rows,
    recentAudit: recentAudit.rows,
  };
}

export interface WorkerActivitySignal {
  lastRunAt: Date | null;
  connectedAccounts: number;
}

// Activity signal for the background worker: sync_runs rows are written by
// apps/worker (BullMQ) and by the serverless sync runner.
export async function getWorkerActivitySignal(): Promise<WorkerActivitySignal> {
  const { rows } = await query<{ last_run_at: Date | null; connected: number }>(
    `SELECT (SELECT max(created_at) FROM sync_runs) AS last_run_at,
            (SELECT count(*) FROM amazon_accounts WHERE status = 'connected')::int AS connected`,
  );
  return { lastRunAt: rows[0]?.last_run_at ?? null, connectedAccounts: rows[0]?.connected ?? 0 };
}

export async function getPlatformSettingRows(): Promise<{ key: string; value: unknown; updated_at: Date; updated_by: string | null }[]> {
  const { rows } = await query<{ key: string; value: unknown; updated_at: Date; updated_by: string | null }>(
    `SELECT key, value, updated_at, updated_by FROM platform_settings`,
  );
  return rows;
}

export async function updatePlatformSetting(key: string, value: unknown, updatedBy: string | null): Promise<void> {
  await query(
    `INSERT INTO platform_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), updatedBy],
  );
}

export interface InsertAuditLogInput {
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function insertAuditLog(input: InsertAuditLogInput): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, success, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      input.actorUserId,
      input.actorEmail,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.success,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}
