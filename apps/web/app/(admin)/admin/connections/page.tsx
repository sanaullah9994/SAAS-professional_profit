import Link from 'next/link';
import { listAdminConnections, clampPage } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import {
  AdminPageHeader,
  EmptyState,
  FilterSelect,
  Pagination,
  SearchForm,
  StatusBadge,
  connectionStatusTone,
  syncStatusTone,
} from '@/components/admin/ui';
import { formatDateTime, formatRelative, marketplaceLabel, titleCase } from '@/components/admin/format';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Connections · Admin · ProfitPilot' };

const PAGE_SIZE = 20;

export default async function AdminConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const page = clampPage(params.page);
  const status = ['pending', 'connected', 'error', 'revoked'].includes(params.status ?? '') ? (params.status as string) : 'all';
  const search = params.q?.slice(0, 100) ?? '';

  const { rows, total } = await listAdminConnections({ search, status, page, pageSize: PAGE_SIZE });

  return (
    <>
      <AdminPageHeader
        title="Amazon Connections"
        description="All seller-account integrations across every workspace. Credentials and OAuth tokens are never displayed."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Connections' }]}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 pb-3 lg:flex-row lg:items-center">
          <SearchForm action="/admin/connections" placeholder="Search by seller id, name or workspace…" defaultValue={search} extra={status !== 'all' ? { status } : {}} />
          <FilterSelect
            action="/admin/connections"
            label="Status"
            name="status"
            value={status}
            options={[
              { value: 'all', label: 'All' },
              { value: 'connected', label: 'Connected' },
              { value: 'pending', label: 'Pending' },
              { value: 'error', label: 'Error' },
              { value: 'revoked', label: 'Revoked' },
            ]}
            extra={search ? { q: search } : {}}
          />
        </CardContent>
        {rows.length === 0 ? (
          <EmptyState message={search || status !== 'all' ? 'No connections match these filters.' : 'No Amazon connections yet.'} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Connection</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Workspace</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Marketplace</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Mode</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Last synced</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Last run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((connection) => (
                  <tr key={connection.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{connection.display_name ?? 'Seller Central'}</p>
                      <p className="text-xs text-muted-foreground">Seller {connection.seller_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/workspaces/${connection.workspace_id}`} className="text-xs font-medium hover:underline">
                        {connection.workspace_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{connection.organization_name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {marketplaceLabel(connection.marketplace_id)}
                      <p className="text-muted-foreground">{connection.region}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={titleCase(connection.status)} tone={connectionStatusTone(connection.status)} />
                    </td>
                    <td className="px-4 py-3 text-xs">{titleCase(connection.provider_mode)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground" title={formatDateTime(connection.last_synced_at)}>
                      {formatRelative(connection.last_synced_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {connection.last_run_status ? (
                        <span className="flex flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <StatusBadge label={titleCase(connection.last_run_status)} tone={syncStatusTone(connection.last_run_status)} />
                            {formatRelative(connection.last_run_at)}
                          </span>
                          {connection.last_run_error ? <span className="line-clamp-2">{connection.last_run_error}</span> : null}
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
        <div className="border-t border-border">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/connections" query={{ q: search || undefined, status: status !== 'all' ? status : undefined }} />
        </div>
      </Card>
    </>
  );
}
