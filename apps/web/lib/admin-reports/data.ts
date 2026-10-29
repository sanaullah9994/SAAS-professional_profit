import {
  getAdminOverviewStats,
  getAdminRegistrationsByDay,
  getAdminRevenueReport,
  getWorkerActivitySignal,
  listAdminAuditLogs,
  listAdminConnections,
  listAdminSyncRuns,
  listAdminUsers,
  listAdminWorkspaces,
} from '@amazon-profit/db';
import { getPlatformSettings } from '@/lib/admin-settings';

const PAGE_SIZE = 100;

async function collectPages<T>(
  fetchPage: (page: number) => Promise<{ rows: T[]; total: number }>,
  maxRows: number,
): Promise<T[]> {
  const first = await fetchPage(1);
  const rows = [...first.rows].slice(0, maxRows);
  const pages = Math.min(Math.ceil(first.total / PAGE_SIZE), Math.ceil(maxRows / PAGE_SIZE));

  for (let page = 2; page <= pages; page++) {
    const result = await fetchPage(page);
    rows.push(...result.rows.slice(0, maxRows - rows.length));
    if (rows.length >= maxRows) break;
  }

  return rows;
}

function dateKey(date: Date | string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

export async function loadAdminReport() {
  const settings = await getPlatformSettings();

  const [
    overview,
    worker,
    users,
    workspaces,
    connections,
    syncRuns,
    auditLogs,
    registrations,
    revenue,
  ] = await Promise.all([
    getAdminOverviewStats(settings.activeUserWindowDays),
    getWorkerActivitySignal(),
    collectPages(
      (page) => listAdminUsers({ page, pageSize: PAGE_SIZE, status: 'all' }),
      5000,
    ),
    collectPages(
      (page) => listAdminWorkspaces({ page, pageSize: PAGE_SIZE }),
      5000,
    ),
    collectPages(
      (page) => listAdminConnections({ page, pageSize: PAGE_SIZE }),
      5000,
    ),
    collectPages(
      (page) => listAdminSyncRuns({ page, pageSize: PAGE_SIZE }),
      2000,
    ),
    collectPages(
      (page) => listAdminAuditLogs({ page, pageSize: PAGE_SIZE }),
      2000,
    ),
    getAdminRegistrationsByDay(30),
    getAdminRevenueReport(2000),
  ]);

  const registrationMap = new Map(
    registrations.map((row) => [row.day, row.count]),
  );

  const registrationDays = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (29 - index));
    const day = date.toISOString().slice(0, 10);
    return { day, count: registrationMap.get(day) ?? 0 };
  });

  return {
    generatedAt: new Date().toISOString(),
    activeUserWindowDays: settings.activeUserWindowDays,
    overview,
    worker,
    users,
    workspaces,
    connections,
    syncRuns,
    auditLogs,
    registrationDays,
    revenue,
    limits: {
      users: 5000,
      workspaces: 5000,
      connections: 5000,
      syncRuns: 2000,
      auditLogs: 2000,
      invoices: 2000,
    },
    truncated: {
      users: users.length >= 5000,
      workspaces: workspaces.length >= 5000,
      connections: connections.length >= 5000,
      syncRuns: syncRuns.length >= 2000,
      auditLogs: auditLogs.length >= 2000,
      invoices: revenue.recent.length >= 2000,
    },
  };
}

export type AdminReport = Awaited<ReturnType<typeof loadAdminReport>>;

export function reportDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function buildReportSections(report: AdminReport) {
  return [
    {
      title: 'Platform summary',
      rows: [
        ['Metric', 'Value'],
        ['Registered users', report.overview.totalUsers],
        ['Active users', report.overview.activeUsers],
        ['Suspended users', report.overview.suspendedUsers],
        ['Platform owners', report.overview.platformOwners],
        ['Organizations', report.overview.totalOrganizations],
        ['Workspaces', report.overview.totalWorkspaces],
        ['Amazon connections', report.connections.length],
        ['Sync runs included', report.syncRuns.length],
        ['Active-user window (days)', report.activeUserWindowDays],
        ['Last worker run', reportDate(report.worker.lastRunAt)],
        ['Connected accounts reported by worker', report.worker.connectedAccounts],
      ],
    },
    {
      title: 'Registrations - last 30 days',
      rows: [
        ['UTC date', 'Registrations'],
        ...report.registrationDays.map((row) => [row.day, row.count]),
      ],
    },
    {
      title: 'Amazon connection status',
      rows: [
        ['Status', 'Count'],
        ...report.overview.connections.map((row) => [row.status, row.count]),
      ],
    },
    {
      title: 'Sync runs - last 30 days',
      rows: [
        ['Status', 'Count'],
        ...report.overview.syncRuns30d.map((row) => [row.status, row.count]),
      ],
    },
    {
      title: 'Users',
      rows: [
        ['Name', 'Email', 'Role', 'Email verified', 'Status', 'Organizations', 'Workspaces', 'Created at', 'Last session'],
        ...report.users.map((row) => [
          row.name,
          row.email,
          row.platform_role,
          row.email_verified ? 'Yes' : 'No',
          row.suspended_at ? 'Suspended' : 'Active',
          row.organization_count,
          row.workspace_count,
          reportDate(row.created_at),
          reportDate(row.last_session_at),
        ]),
      ],
    },
    {
      title: 'Workspaces',
      rows: [
        ['Workspace', 'Slug', 'Organization', 'Owner email', 'Members', 'Connections', 'Created at'],
        ...report.workspaces.map((row) => [
          row.name,
          row.slug,
          row.organization_name,
          row.owner_email ?? '',
          row.member_count,
          row.connection_count,
          reportDate(row.created_at),
        ]),
      ],
    },
    {
      title: 'Amazon connections',
      rows: [
        ['Workspace', 'Organization', 'Display name', 'Seller ID', 'Marketplace', 'Region', 'Status', 'Provider mode', 'Connected at', 'Last synced at', 'Last run status'],
        ...report.connections.map((row) => [
          row.workspace_name,
          row.organization_name,
          row.display_name ?? '',
          row.seller_id,
          row.marketplace_id,
          row.region,
          row.status,
          row.provider_mode,
          reportDate(row.connected_at),
          reportDate(row.last_synced_at),
          row.last_run_status ?? '',
        ]),
      ],
    },
    {
      title: 'Sync runs',
      rows: [
        ['Workspace', 'Account', 'Seller ID', 'Status', 'Trigger', 'Records processed', 'Started at', 'Completed at', 'Created at', 'Error'],
        ...report.syncRuns.map((row) => [
          row.workspace_name,
          row.account_display_name ?? '',
          row.account_seller_id ?? '',
          row.status,
          row.trigger,
          row.records_processed,
          reportDate(row.started_at),
          reportDate(row.completed_at),
          reportDate(row.created_at),
          row.error_message ?? '',
        ]),
      ],
    },
    {
      title: 'Administrative audit logs',
      rows: [
        ['Action', 'Actor', 'Entity type', 'Entity ID', 'Success', 'IP address', 'Created at'],
        ...report.auditLogs.map((row) => [
          row.action,
          row.actor_email ?? '',
          row.entity_type ?? '',
          row.entity_id ?? '',
          row.success ? 'Yes' : 'No',
          row.ip_address ?? '',
          reportDate(row.created_at),
        ]),
      ],
    },
    {
      title: 'Invoice summary',
      rows: [
        ['Metric', 'Value'],
        ['Total invoices', report.revenue.invoiceCount],
        ['Paid invoices', report.revenue.paidCount],
        ['Pending invoices', report.revenue.pendingCount],
        ['Void invoices', report.revenue.voidCount],
        ['Paid total', report.revenue.paidTotal],
        ['Pending total', report.revenue.pendingTotal],
        ['Void total', report.revenue.voidTotal],
      ],
    },
    {
      title: 'Recent invoices',
      rows: [
        ['Invoice number', 'Status', 'Amount due', 'Issue date', 'Workspace', 'Organization'],
        ...report.revenue.recent.map((row) => [
          row.invoice_number,
          row.status,
          row.amount_due,
          reportDate(row.issue_date),
          row.workspace_name,
          row.organization_name,
        ]),
      ],
    },
  ];
}
