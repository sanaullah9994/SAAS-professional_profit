import Link from 'next/link';
import { getAdminOverviewStats, getWorkerActivitySignal } from '@amazon-profit/db';
import { Card, CardContent, CardHeader, CardTitle } from '@amazon-profit/ui';
import { AdminPageHeader, EmptyState, StatusBadge, connectionStatusTone, healthTone, syncStatusTone } from '@/components/admin/ui';
import { formatDateTime, formatNumber, formatRelative, titleCase } from '@/components/admin/format';
import { requirePlatformAdminPage } from '@/lib/admin-auth';
import { getPlatformSettings } from '@/lib/admin-settings';
import {
  checkNestApi,
  checkPostgres,
  checkRedis,
  checkWorker,
  checkWebApp,
  type HealthCheck,
} from '@/lib/admin-health';
import { ReportDownloadButtons } from '@/components/admin/report-download-buttons';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Overview · ProfitPilot' };

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <b className="mt-2 block text-2xl">{value}</b>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  await requirePlatformAdminPage();
  const settings = await getPlatformSettings();
  const [stats, workerSignal, webCheck, pgCheck, redisCheck, apiCheck] = await Promise.all([
    getAdminOverviewStats(settings.activeUserWindowDays),
    getWorkerActivitySignal(),
    checkWebApp(),
    checkPostgres(),
    checkRedis(),
    checkNestApi(),
  ]);
  const workerCheck = await checkWorker(workerSignal.lastRunAt, workerSignal.connectedAccounts);
  const checks: HealthCheck[] = [webCheck, apiCheck, pgCheck, redisCheck, workerCheck];

  const totalConnections = stats.connections.reduce((sum, row) => sum + row.count, 0);
  const completedRuns = stats.syncRuns30d.find((row) => row.status === 'completed')?.count ?? 0;
  const failedRuns = stats.syncRuns30d.find((row) => row.status === 'failed')?.count ?? 0;

  return (
    <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <AdminPageHeader
          title="Platform Overview"
          description="Real-time snapshot of users, workspaces, connections and synchronization across the platform."
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Overview' }]}
        />
      </div>
      <ReportDownloadButtons />
    </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registered users" value={formatNumber(stats.totalUsers)} hint={`${formatNumber(stats.platformOwners)} platform owner${stats.platformOwners === 1 ? '' : 's'}`} />
        <MetricCard
          label="Active users"
          value={formatNumber(stats.activeUsers)}
          hint={`Signed in within the last ${settings.activeUserWindowDays} days`}
        />
        <MetricCard label="Workspaces" value={formatNumber(stats.totalWorkspaces)} hint={`${formatNumber(stats.totalOrganizations)} organizations`} />
        <MetricCard label="Amazon connections" value={formatNumber(totalConnections)} hint={stats.connections.map((row) => `${row.count} ${row.status}`).join(' · ') || 'None yet'} />
        <MetricCard label="Sync jobs completed" value={formatNumber(completedRuns)} hint="Last 30 days" />
        <MetricCard label="Sync jobs failed" value={formatNumber(failedRuns)} hint="Last 30 days" />
        <MetricCard label="Suspended accounts" value={formatNumber(stats.suspendedUsers)} hint="Enforced server-side at sign-in" />
        <MetricCard label="Platform settings" value={settings.signupsEnabled ? 'Sign-ups on' : 'Sign-ups off'} hint={settings.syncRetryEnabled ? 'Sync retries enabled' : 'Sync retries disabled'} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Service health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {checks.map((check) => (
              <div key={check.name} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{check.name}</p>
                  <StatusBadge label={titleCase(check.state)} tone={healthTone(check.state)} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{check.detail}</p>
                {check.latencyMs !== null ? <p className="mt-1 text-xs text-muted-foreground">{check.latencyMs} ms</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Worker status is derived from recorded sync activity — there is no live process heartbeat. Checked{' '}
            {formatDateTime(new Date().toISOString())}.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent registrations</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentUsers.length === 0 ? (
              <EmptyState message="No users registered yet." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recentUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                            {user.name || user.email}
                          </Link>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={user.suspended_at ? 'Suspended' : 'Active'} tone={user.suspended_at ? 'destructive' : 'success'} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatRelative(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sync failures</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentSyncFailures.length === 0 ? (
              <EmptyState message="No failed sync runs recorded." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Run</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Workspace</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recentSyncFailures.map((run) => (
                      <tr key={run.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2.5">
                          <StatusBadge label={titleCase(run.status)} tone={syncStatusTone(run.status)} />
                          {run.account_seller_id ? <p className="mt-1 text-xs text-muted-foreground">Seller {run.account_seller_id}</p> : null}
                          {run.error_message ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run.error_message}</p> : null}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{run.workspace_name}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatRelative(run.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link href="/admin/sync-jobs" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
              View all sync jobs →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent administrative activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {stats.recentAudit.length === 0 ? (
            <EmptyState message="No administrative activity recorded yet." />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Action</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Actor</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">Result</th>
                    <th className="h-10 px-3 text-left font-medium text-muted-foreground">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentAudit.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2.5 font-medium">{entry.action}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{entry.actor_email ?? 'system'}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge label={entry.success ? 'Success' : 'Failure'} tone={entry.success ? 'success' : 'destructive'} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatRelative(entry.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/admin/audit-logs" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            View all audit logs →
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
