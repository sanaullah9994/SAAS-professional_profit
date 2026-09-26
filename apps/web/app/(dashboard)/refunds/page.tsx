import { listTable } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { formatCurrency } from '@amazon-profit/utils';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type RefundRow = { amazon_order_id: string; sku: string; amount: string; refund_admin_fee: string; reason: string };

export default async function Page() {
  const refunds = (await listTable('refunds', await workspaceId())) as RefundRow[];
  const rows = refunds.map((r) => [r.amazon_order_id, r.sku ?? '—', formatCurrency(Number(r.amount)), formatCurrency(Number(r.refund_admin_fee)), r.reason ?? '—']);
  return (
    <>
      <PageHeader title="Refund Analytics" description="Refund amounts, administration fees, affected SKUs, and reasons." />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Order ID', 'SKU', 'Amount', 'Admin fee', 'Reason']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No refunds yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
