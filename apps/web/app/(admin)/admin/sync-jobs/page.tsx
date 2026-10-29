import Link from 'next/link';
import { listAdminSyncRuns, clampPage } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import {
  AdminPageHeader,
  EmptyState,
  FilterSelect,
  Pagination,
  SearchForm,
  StatusBadge,
  syncStatusTone,
} from '@/components/admin/ui';
import { formatDateTime, formatNumber, formatRelative, titleCase } from '@/components/admin/format';
import { SyncRetryButton } from '@/components/admin/sync-retry-button';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sync Jobs · Admin · ProfitPilot' };

const PAGE_SIZE = 25;

export default async function AdminSyncJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const page = clampPage(params.page);
  const status = ['running', 'completed', 'failed'].includes(params.status ?? '') ? (params.status as string) : 'all';
  const search = params.q?.slice(0, 100) ?? '';

  const { rows, total } = await listAdminSyncRuns({ search, status, page, pageSize: PAGE_SIZE });

  return (
    <>
      <AdminPageHeader
        title="Sync Jobs"
        description="Synchronization history from the existing worker and sync runner. Failed live-account runs can be retried safely."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Sync Jobs' }]}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 pb-3 lg:flex-row lg:items-center">
          <SearchForm action="/admin/sync-jobs" placeholder="Search by error, seller id or workspace…" defaultValue={search} extra={status !== 'all' ? { status } : {}} />
          <FilterSelect
            action="/admin/sync-jobs"
            label="Status"
            name="status"
            value={status}
            options={[
              { value: 'all', label: 'All' },
              { value: 'completed', label: 'Completed' },
              { value: 'running', label: 'Running' },
              { value: 'failed', label: 'Failed' },
            ]}
            extra={search ? { q: search } : {}}
          />
        </CardContent>
        {rows.length === 0 ? (
          <EmptyState message={search || status !== 'all' ? 'No sync runs match these filters.' : 'No sync runs recorded yet.'} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Account</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Workspace</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Trigger</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Records</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Started / created</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Completed</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Error</th>
                  <th className="h-11 px-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((run) => (
                  <tr key={run.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <StatusBadge label={titleCase(run.status)} tone={syncStatusTone(run.status)} />
                    </td>
                    <td className="px-4 py-3">
                      {run.amazon_account_id ? (
                        <>
                          <p className="font-medium">{run.account_display_name ?? 'Seller Central'}</p>
                          <p className="text-xs text-muted-foreground">
                            Seller {run.account_seller_id ?? '—'}
                            {run.provider_mode ? ` · ${run.provider_mode}` : ''}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/workspaces/${run.workspace_id}`} className="text-xs font-medium hover:underline">
                        {run.workspace_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{titleCase(run.trigger)}</td>
                    <td className="px-4 py-3 text-xs">{formatNumber(run.records_processed)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground" title={formatDateTime(run.started_at)}>
                      {formatRelative(run.started_at ?? run.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground" title={formatDateTime(run.completed_at)}>
                      {formatRelative(run.completed_at)}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-xs text-muted-foreground">
                      {run.error_message ? <span className="line-clamp-3">{run.error_message}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {run.amazon_account_id && run.provider_mode === 'live' && run.status === 'failed' ? (
                        <SyncRetryButton syncRunId={run.id} />
                      ) : run.amazon_account_id && run.provider_mode !== 'live' ? (
                        <span className="text-xs text-muted-foreground" title="Mock connections sync through the background worker queue.">
                          Worker-managed
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
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/sync-jobs" query={{ q: search || undefined, status: status !== 'all' ? status : undefined }} />
        </div>
      </Card>
    </>
  );
}
