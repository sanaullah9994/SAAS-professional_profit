import Link from 'next/link';
import { listAdminWorkspaces, clampPage } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { AdminPageHeader, EmptyState, Pagination, SearchForm } from '@/components/admin/ui';
import { formatRelative } from '@/components/admin/format';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspaces · Admin · ProfitPilot' };

const PAGE_SIZE = 20;

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const page = clampPage(params.page);
  const search = params.q?.slice(0, 100) ?? '';

  const { rows, total } = await listAdminWorkspaces({ search, page, pageSize: PAGE_SIZE });

  return (
    <>
      <AdminPageHeader
        title="Workspaces"
        description="Every customer workspace with its organization, owner and connection counts."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Workspaces' }]}
      />

      <Card>
        <CardContent className="p-5 pb-3">
          <SearchForm action="/admin/workspaces" placeholder="Search by workspace, slug or organization…" defaultValue={search} />
        </CardContent>
        {rows.length === 0 ? (
          <EmptyState message={search ? 'No workspaces match this search.' : 'No workspaces yet.'} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Workspace</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Organization</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Members</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Connections</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((workspace) => (
                  <tr key={workspace.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/workspaces/${workspace.id}`} className="font-medium hover:underline">
                        {workspace.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{workspace.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{workspace.organization_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{workspace.owner_email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{workspace.member_count}</td>
                    <td className="px-4 py-3 text-xs">{workspace.connection_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground" title={workspace.created_at instanceof Date ? workspace.created_at.toISOString() : undefined}>
                      {formatRelative(workspace.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/workspaces" query={{ q: search || undefined }} />
        </div>
      </Card>
    </>
  );
}
