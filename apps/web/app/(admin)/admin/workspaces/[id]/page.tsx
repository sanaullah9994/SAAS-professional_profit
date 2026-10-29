import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAdminWorkspaceDetail,
  getAdminWorkspaceMembers,
  listAdminConnections,
  listAdminSyncRuns,
} from '@amazon-profit/db';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@amazon-profit/ui';
import {
  AdminPageHeader,
  EmptyState,
  StatusBadge,
  connectionStatusTone,
  syncStatusTone,
} from '@/components/admin/ui';
import { formatDateTime, formatRelative, marketplaceLabel, titleCase } from '@/components/admin/format';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace detail · Admin · ProfitPilot' };

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdminPage();
  const { id } = await params;

  const workspace = await getAdminWorkspaceDetail(id);
  if (!workspace) notFound();

  const [members, connections, syncRuns] = await Promise.all([
    getAdminWorkspaceMembers(workspace.id),
    listAdminConnections({ page: 1, pageSize: 50, workspaceId: workspace.id }),
    listAdminSyncRuns({ page: 1, pageSize: 10, workspaceId: workspace.id }),
  ]);
  const workspaceConnections = connections.rows;

  return (
    <>
      <AdminPageHeader
        title={workspace.name}
        description={`${workspace.organization_name} · ${workspace.slug}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Workspaces', href: '/admin/workspaces' },
          { label: workspace.name },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            <dl className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Organization</dt>
                <dd className="text-right font-medium">{workspace.organization_name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Org slug</dt>
                <dd className="font-mono text-xs">{workspace.organization_slug}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{workspace.currency}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Timezone</dt>
                <dd>{workspace.timezone}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Created</dt>
                <dd title={formatDateTime(workspace.created_at)}>{formatRelative(workspace.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Workspace ID</dt>
                <dd className="truncate font-mono text-xs" title={workspace.id}>
                  {workspace.id}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {members.length === 0 ? (
              <EmptyState message="No members." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Member</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Org role</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Account</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((member) => (
                      <tr key={member.user_id} className="hover:bg-muted/50">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/users/${member.user_id}`} className="font-medium hover:underline">
                            {member.name || member.email}
                          </Link>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={member.role === 'owner' ? 'default' : 'outline'}>{titleCase(member.role)}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={member.suspended_at ? 'Suspended' : 'Active'} tone={member.suspended_at ? 'destructive' : 'success'} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground" title={formatDateTime(member.joined_at)}>
                          {formatRelative(member.joined_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Amazon connections</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {workspaceConnections.length === 0 ? (
              <EmptyState message="No Amazon connections in this workspace." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Connection</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Marketplace</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Mode</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Last synced</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Last run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workspaceConnections.map((connection) => (
                      <tr key={connection.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{connection.display_name ?? 'Seller Central'}</p>
                          <p className="text-xs text-muted-foreground">Seller {connection.seller_id}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{marketplaceLabel(connection.marketplace_id)}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={titleCase(connection.status)} tone={connectionStatusTone(connection.status)} />
                        </td>
                        <td className="px-3 py-2.5 text-xs">{titleCase(connection.provider_mode)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground" title={formatDateTime(connection.last_synced_at)}>
                          {formatRelative(connection.last_synced_at)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {connection.last_run_status ? (
                            <span className="flex items-center gap-2">
                              <StatusBadge label={titleCase(connection.last_run_status)} tone={syncStatusTone(connection.last_run_status)} />
                              {formatRelative(connection.last_run_at)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent sync runs</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-3 text-xs text-muted-foreground">
              Latest runs for this workspace — see the full list on the{' '}
              <Link href="/admin/sync-jobs" className="font-medium text-primary hover:underline">
                Sync Jobs
              </Link>{' '}
              page.
            </p>
            {syncRuns.rows.length === 0 ? (
              <EmptyState message="No sync runs recorded." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Workspace</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Trigger</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {syncRuns.rows.map((run) => (
                      <tr key={run.id} className={run.workspace_id === workspace.id ? 'bg-muted/40 hover:bg-muted/60' : 'hover:bg-muted/50'}>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={titleCase(run.status)} tone={syncStatusTone(run.status)} />
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {run.workspace_id === workspace.id ? <span className="font-medium">{run.workspace_name}</span> : run.workspace_name}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{titleCase(run.trigger)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatRelative(run.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
