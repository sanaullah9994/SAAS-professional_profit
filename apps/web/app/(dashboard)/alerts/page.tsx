import { listTable } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { DataTable, PageHeader } from '@/components/dashboard';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const SEVERITY_LABEL: Record<string, string> = { critical: 'Critical', warning: 'Warning', info: 'Info' };

export default async function Page() {
  const alerts = (await listTable('alerts', await workspaceId())) as { severity: string; title: string; message: string }[];
  const rows = alerts.map((a) => [SEVERITY_LABEL[a.severity] ?? a.severity, a.title, a.message]);
  return (
    <>
      <PageHeader title="Alerts" description="Profit, PPC, refund, sync, and data-quality exceptions." />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Severity', 'Alert', 'Message']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No alerts right now.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
