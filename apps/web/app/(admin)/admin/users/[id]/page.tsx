import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPlatformUserById,
  getAdminUserMemberships,
  getAdminUserConnections,
  getAdminUserInvoices,
  countActivePlatformOwners,
} from '@amazon-profit/db';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@amazon-profit/ui';
import { AdminPageHeader, EmptyState, StatusBadge, connectionStatusTone } from '@/components/admin/ui';
import { formatDateTime, formatRelative, marketplaceLabel, titleCase } from '@/components/admin/format';
import { UserActions } from '@/components/admin/user-actions';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'User detail · Admin · ProfitPilot' };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdminPage();
  const { id } = await params;

  const user = await getPlatformUserById(id);
  if (!user) notFound();

  const [memberships, connections, invoices, owners] = await Promise.all([
    getAdminUserMemberships(user.id),
    getAdminUserConnections(user.id),
    getAdminUserInvoices(user.id),
    countActivePlatformOwners(),
  ]);
  const isOwner = user.platform_role === 'owner';
  const lastOwner = isOwner && !user.suspended_at && owners <= 1;

  return (
    <>
      <AdminPageHeader
        title={user.name || user.email}
        description={user.email}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users', href: '/admin/users' }, { label: user.email }]}
        action={
          <UserActions userId={user.id} userName={user.name || user.email} suspended={Boolean(user.suspended_at)} canSuspend={user.id !== admin.id && !lastOwner} />
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            <dl className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge label={user.suspended_at ? 'Suspended' : 'Active'} tone={user.suspended_at ? 'destructive' : 'success'} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Platform role</dt>
                <dd>{isOwner ? <Badge>Owner</Badge> : <Badge variant="outline">User</Badge>}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Email verified</dt>
                <dd>{user.email_verified ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">User ID</dt>
                <dd className="truncate font-mono text-xs" title={user.id}>
                  {user.id}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Joined</dt>
                <dd title={formatDateTime(user.created_at)}>{formatRelative(user.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd title={formatDateTime(user.updated_at)}>{formatRelative(user.updated_at)}</dd>
              </div>
              {user.suspended_at ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Suspended {formatRelative(user.suspended_at)}</p>
                  {user.suspended_reason ? <p className="mt-1 text-xs text-muted-foreground">Reason: {user.suspended_reason}</p> : null}
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Organization memberships</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {memberships.length === 0 ? (
              <EmptyState message="No organization memberships." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Organization</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Role</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Workspace</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {memberships.map((membership, index) => (
                      <tr key={`${membership.organization_id}-${membership.workspace_id ?? 'none'}-${index}`} className="hover:bg-muted/50">
                        <td className="px-3 py-2.5 font-medium">{membership.organization_name}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={membership.role === 'owner' ? 'default' : 'outline'}>{titleCase(membership.role)}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          {membership.workspace_id ? (
                            <Link href={`/admin/workspaces/${membership.workspace_id}`} className="hover:underline">
                              {membership.workspace_name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground" title={formatDateTime(membership.joined_at)}>
                          {formatRelative(membership.joined_at)}
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
            {connections.length === 0 ? (
              <EmptyState message="No Amazon connections in this user's organizations." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Connection</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Workspace</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Marketplace</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Mode</th>
                      <th className="h-10 px-3 text-left font-medium text-muted-foreground">Last synced</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {connections.map((connection) => (
                      <tr key={connection.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{connection.display_name ?? 'Seller Central'}</p>
                          <p className="text-xs text-muted-foreground">Seller {connection.seller_id}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/workspaces`} className="text-xs hover:underline">
                            {connection.workspace_name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{marketplaceLabel(connection.marketplace_id)}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={titleCase(connection.status)} tone={connectionStatusTone(connection.status)} />
                        </td>
                        <td className="px-3 py-2.5 text-xs">{titleCase(connection.provider_mode)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground" title={formatDateTime(connection.last_synced_at)}>
                          {formatRelative(connection.last_synced_at)}
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
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Subscription and payment processing is not implemented in this platform yet — there are no plan, seat or payment
              provider tables. Invoice history below is read-only data from the existing <code className="rounded bg-muted px-1">invoices</code>{' '}
              table; a future billing integration can extend this section.
            </p>
            <div className="mt-4">
              {invoices.length === 0 ? (
                <EmptyState message="No invoice records." />
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">Invoice</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">Workspace</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">Amount</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/50">
                          <td className="px-3 py-2.5 font-medium">{invoice.invoice_number}</td>
                          <td className="px-3 py-2.5 text-xs">{invoice.workspace_name}</td>
                          <td className="px-3 py-2.5">
                            <StatusBadge
                              label={titleCase(invoice.status)}
                              tone={invoice.status === 'paid' ? 'success' : invoice.status === 'void' ? 'outline' : 'warning'}
                            />
                          </td>
                          <td className="px-3 py-2.5">${Number(invoice.amount_due).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDateTime(invoice.issue_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
