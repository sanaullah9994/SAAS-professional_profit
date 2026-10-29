import { listAdminAuditLogs, clampPage } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { AdminPageHeader, EmptyState, FilterSelect, Pagination, StatusBadge } from '@/components/admin/ui';
import { formatDateTime, formatRelative } from '@/components/admin/format';
import { requirePlatformAdminPage } from '@/lib/admin-auth';
import { ADMIN_AUDIT_ACTIONS } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit Logs · Admin · ProfitPilot' };

const PAGE_SIZE = 25;

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const page = clampPage(params.page);
  const action = params.action && ADMIN_AUDIT_ACTIONS.includes(params.action as (typeof ADMIN_AUDIT_ACTIONS)[number]) ? params.action : 'all';

  const { rows, total } = await listAdminAuditLogs({ action, page, pageSize: PAGE_SIZE });

  return (
    <>
      <AdminPageHeader
        title="Audit Logs"
        description="Trail of sensitive administrative operations: actor, action, target, result and safe metadata."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit Logs' }]}
      />

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-5 pb-3">
          <p className="text-sm text-muted-foreground">Passwords, tokens and request bodies are never recorded.</p>
          <FilterSelect
            action="/admin/audit-logs"
            label="Action"
            name="action"
            value={action}
            options={[
              { value: 'all', label: 'All actions' },
              ...ADMIN_AUDIT_ACTIONS.map((value) => ({ value, label: value })),
            ]}
          />
        </CardContent>
        {rows.length === 0 ? (
          <EmptyState message="No audit entries recorded yet." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">When</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Actor</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Action</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Target</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Result</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-xs text-muted-foreground" title={formatDateTime(entry.created_at)}>
                      {formatRelative(entry.created_at)}
                      <p>{formatDateTime(entry.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.actor_name ?? entry.actor_email ?? 'system'}</p>
                      {entry.actor_email && entry.actor_name ? <p className="text-xs text-muted-foreground">{entry.actor_email}</p> : null}
                      {entry.ip_address ? <p className="text-xs text-muted-foreground">IP {entry.ip_address}</p> : null}
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.action}</td>
                    <td className="px-4 py-3 text-xs">
                      {entry.entity_type ? <span className="font-medium">{entry.entity_type}</span> : <span className="text-muted-foreground">—</span>}
                      {entry.entity_id ? <p className="truncate font-mono text-xs text-muted-foreground">{entry.entity_id}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={entry.success ? 'Success' : 'Failure'} tone={entry.success ? 'success' : 'destructive'} />
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                        <pre className="whitespace-pre-wrap break-all rounded bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                          {JSON.stringify(entry.metadata, null, 0)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/audit-logs" query={{ action: action !== 'all' ? action : undefined }} />
        </div>
      </Card>
    </>
  );
}
