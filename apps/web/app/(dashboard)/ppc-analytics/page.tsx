import { getPpcCampaigns } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { formatCurrency, formatPercent } from '@amazon-profit/utils';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const campaigns = await getPpcCampaigns(await workspaceId(), 30);
  const rows = campaigns.map((c) => [c.campaign, formatCurrency(c.spend), formatCurrency(c.sales), formatPercent(c.acosPercent), c.roas.toFixed(2)]);
  return (
    <>
      <PageHeader title="PPC Analytics" description="Amazon Ads performance with advertised-SKU allocation and separate unattributed spend." />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Campaign', 'Spend', 'Sales', 'ACoS', 'ROAS']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No campaign data for this period yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
