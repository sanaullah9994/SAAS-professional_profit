import { listTable } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { formatCurrency } from '@amazon-profit/utils';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type OrderRow = { amazon_order_id: string; purchase_date: string; order_status: string; units: string; revenue: string };

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default async function Page() {
  const orders = (await listTable('orders', await workspaceId())) as OrderRow[];
  const rows = orders.map((o) => [o.amazon_order_id, dateFmt(o.purchase_date), o.order_status, o.units, formatCurrency(Number(o.revenue))]);
  return (
    <>
      <PageHeader title="Orders" description="Orders and item revenue imported from Seller Central." />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Order ID', 'Purchase date', 'Status', 'Units', 'Revenue']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
