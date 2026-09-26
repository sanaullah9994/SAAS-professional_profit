import { getOverview } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { formatCurrency, formatPercent } from '@amazon-profit/utils';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const o = await getOverview(await workspaceId(), 30);
  const amazonFeesAndOther = o.revenue - o.profit - o.refunds - o.adSpend - o.cogs;
  const pct = (v: number) => (o.revenue ? formatPercent((v / o.revenue) * 100) : '—');

  const rows = o.revenue
    ? [
        ['Product revenue', formatCurrency(o.revenue), pct(o.revenue)],
        ['Amazon fees & other costs', `-${formatCurrency(amazonFeesAndOther)}`, pct(amazonFeesAndOther)],
        ['Refunds', `-${formatCurrency(o.refunds)}`, pct(o.refunds)],
        ['Advertising', `-${formatCurrency(o.adSpend)}`, pct(o.adSpend)],
        ['COGS + landed costs', `-${formatCurrency(o.cogs)}`, pct(o.cogs)],
        ['True net profit', formatCurrency(o.profit), pct(o.profit)],
      ]
    : [];

  return (
    <>
      <PageHeader title="Profit & Loss" description="True P&L including Amazon fees, refunds, landed cost, advertising, and operating costs." />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Line item', 'Current period', '% of revenue']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No profit data for this period yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
