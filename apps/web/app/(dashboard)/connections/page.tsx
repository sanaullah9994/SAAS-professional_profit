import { listTable } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { ConnectionActionsPanel } from '@/components/connection-actions';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type AccountRow = { display_name: string; marketplace_id: string; status: string; provider_mode: string; profile_id: string | null; ads_status: string | null };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const marketplaceLabel = (id: string) => (id === 'ATVPDKIKX0DER' ? 'Amazon US' : id);

export default async function Page() {
  const accounts = (await listTable('amazon_accounts', await workspaceId())) as AccountRow[];
  const rows = accounts.flatMap((a) => {
    const out = [['Seller Central', marketplaceLabel(a.marketplace_id), cap(a.status), cap(a.provider_mode)]];
    if (a.profile_id) out.push(['Amazon Ads', marketplaceLabel(a.marketplace_id), cap(a.ads_status ?? 'pending'), cap(a.provider_mode)]);
    return out;
  });
  return (
    <>
      <PageHeader title="Amazon Connections" description="Connect a live Amazon seller account through Selling Partner API, or use the mock connection for development." />
      <ConnectionActionsPanel />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Connection', 'Marketplace', 'Status', 'Mode']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No connections yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
