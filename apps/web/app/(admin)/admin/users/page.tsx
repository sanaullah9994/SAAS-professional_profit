import Link from 'next/link';
import { listAdminUsers, countActivePlatformOwners, clampPage } from '@amazon-profit/db';
import { Badge, Card, CardContent } from '@amazon-profit/ui';
import {
  AdminPageHeader,
  EmptyState,
  FilterSelect,
  Pagination,
  SearchForm,
  StatusBadge,
} from '@/components/admin/ui';
import { formatDateTime, formatRelative } from '@/components/admin/format';
import { UserActions } from '@/components/admin/user-actions';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users · Admin · ProfitPilot' };

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const admin = await requirePlatformAdminPage();
  const params = await searchParams;
  const page = clampPage(params.page);
  const status = params.status === 'suspended' || params.status === 'active' ? params.status : 'all';
  const search = params.q?.slice(0, 100) ?? '';

  const [{ rows, total }, owners] = await Promise.all([
    listAdminUsers({ search, status, page, pageSize: PAGE_SIZE }),
    countActivePlatformOwners(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="All registered accounts. Suspend and reactivate are enforced server-side and recorded in the audit log."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 pb-3 lg:flex-row lg:items-center">
          <SearchForm action="/admin/users" placeholder="Search by email or name…" defaultValue={search} extra={status !== 'all' ? { status } : {}} />
          <FilterSelect
            action="/admin/users"
            label="Status"
            name="status"
            value={status}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
            extra={search ? { q: search } : {}}
          />
        </CardContent>
        {rows.length === 0 ? (
          <EmptyState message={search ? 'No users match this search.' : 'No users registered yet.'} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">User</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Platform role</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Workspaces</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Last activity</th>
                  <th className="h-11 px-4 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="h-11 px-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((user) => {
                  const isOwner = user.platform_role === 'owner';
                  const lastOwner = isOwner && !user.suspended_at && owners <= 1;
                  return (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                          {user.name || user.email}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                          {!user.email_verified ? ' · unverified' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={user.suspended_at ? 'Suspended' : 'Active'} tone={user.suspended_at ? 'destructive' : 'success'} />
                      </td>
                      <td className="px-4 py-3">
                        {isOwner ? <Badge>Owner</Badge> : <Badge variant="outline">User</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.workspace_count} workspace{user.workspace_count === 1 ? '' : 's'} · {user.organization_count} org
                        {user.organization_count === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground" title={formatDateTime(user.last_session_at)}>
                        {formatRelative(user.last_session_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground" title={formatDateTime(user.created_at)}>
                        {formatRelative(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <UserActions
                          userId={user.id}
                          userName={user.name || user.email}
                          suspended={Boolean(user.suspended_at)}
                          canSuspend={user.id !== admin.id && !lastOwner}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border">
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/users" query={{ q: search || undefined, status: status !== 'all' ? status : undefined }} />
        </div>
      </Card>
    </>
  );
}
