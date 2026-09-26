import { listTable } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { formatCurrency } from '@amazon-profit/utils';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type CogsRow = {
  sku: string;
  effective_from: string;
  unit_cogs: string;
  inbound_freight_per_unit: string;
  customs_per_unit: string;
  prep_fee_per_unit: string;
};

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default async function Page() {
  const cogs = (await listTable('cogs_history', await workspaceId())) as CogsRow[];
  const rows = cogs.map((c) => [
    c.sku,
    dateFmt(c.effective_from),
    formatCurrency(Number(c.unit_cogs)),
    formatCurrency(Number(c.inbound_freight_per_unit)),
    formatCurrency(Number(c.customs_per_unit)),
    formatCurrency(Number(c.prep_fee_per_unit)),
  ]);
  return (
    <>
      <PageHeader title="COGS Manager" description="Effective-dated COGS, freight, customs, and prep costs with CSV bulk upload." />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['SKU', 'Effective from', 'COGS', 'Inbound', 'Customs', 'Prep']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No COGS records yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
