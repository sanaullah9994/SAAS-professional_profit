import { listTable } from '@amazon-profit/db';
import { Card, CardContent } from '@amazon-profit/ui';
import { DataTable, PageHeader } from '@/components/dashboard';
import { SyncNowButton } from '@/components/sync-now-button';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

type SyncRow = { started_at: string; trigger: string; from_date: string | null; to_date: string | null; records_processed: number; status: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dateTimeFmt = (iso: string) => new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function rangeLabel(from: string | null, to: string | null) {
  if (!from || !to) return '—';
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
  return `${days} day${days === 1 ? '' : 's'}`;
}

export default async function Page() {
  const runs = (await listTable('sync_runs', await workspaceId())) as SyncRow[];
  const rows = runs.map((r) => [dateTimeFmt(r.started_at), cap(r.trigger), rangeLabel(r.from_date, r.to_date), r.records_processed.toLocaleString(), cap(r.status)]);
  return (
    <>
      <PageHeader title="Sync History" description="Hourly and manual imports with retries and run status." action={<SyncNowButton />} />
      <Card>
        <CardContent className="pt-5">
          {rows.length > 0 ? (
            <DataTable headers={['Started', 'Trigger', 'Range', 'Records', 'Status']} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No sync runs yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
