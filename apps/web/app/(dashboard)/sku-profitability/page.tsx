import { getSkuProfitability } from '@amazon-profit/db';
import { Button, Card, CardContent } from '@amazon-profit/ui';
import { formatCurrency, formatPercent } from '@amazon-profit/utils';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const skus = await getSkuProfitability(await workspaceId(), 30);
  const rows = skus.map((r) => [
    r.sku,
    r.asin,
    r.units.toLocaleString(),
    formatCurrency(r.revenue),
    formatCurrency(r.amazonFees),
    formatCurrency(r.adSpend),
    formatCurrency(r.cogs),
    formatCurrency(r.refunds),
    formatCurrency(r.netProfit),
    formatPercent(r.marginPercent),
  ]);
  return (
    <>
      <PageHeader
        title="SKU Profitability"
        description="True profit by SKU and ASIN using the COGS active on each order date."
        action={
          <Button asChild variant="outline">
            <a href="/api/v1/profit/skus.csv">Export CSV</a>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['SKU', 'ASIN', 'Units', 'Revenue', 'Amazon Fees', 'Ads', 'Landed Cost', 'Refunds', 'Net Profit', 'Margin']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No profit data for this period yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
