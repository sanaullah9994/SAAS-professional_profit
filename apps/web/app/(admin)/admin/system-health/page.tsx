import { getWorkerActivitySignal } from '@amazon-profit/db';
import { Card, CardContent, CardHeader, CardTitle } from '@amazon-profit/ui';
import { AdminPageHeader, StatusBadge, healthTone } from '@/components/admin/ui';
import { formatDateTime, formatRelative, titleCase } from '@/components/admin/format';
import { requirePlatformAdminPage } from '@/lib/admin-auth';
import { checkNestApi, checkPostgres, checkRedis, checkWebApp, checkWorker } from '@/lib/admin-health';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'System Health · Admin · ProfitPilot' };

export default async function AdminSystemHealthPage() {
  await requirePlatformAdminPage();

  const [signal, web, pg, redis, api] = await Promise.all([getWorkerActivitySignal(), checkWebApp(), checkPostgres(), checkRedis(), checkNestApi()]);
  const worker = await checkWorker(signal.lastRunAt, signal.connectedAccounts);
  const checks = [web, api, pg, redis, worker];

  return (
    <>
      <AdminPageHeader
        title="System Health"
        description="Live probes of each service. Unknown means the check could not be verified — not that the service is healthy."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'System Health' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <Card key={check.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{check.name}</CardTitle>
                <StatusBadge label={titleCase(check.state)} tone={healthTone(check.state)} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              <p>{check.detail}</p>
              {check.latencyMs !== null ? <p className="mt-2 text-xs">Probe latency: {check.latencyMs} ms</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How each check works</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium text-foreground">Web application</span> — this page was served by the Next.js app, so it is up.
            </li>
            <li>
              <span className="font-medium text-foreground">NestJS API</span> — probes the existing <code className="rounded bg-muted px-1">GET /v1/health</code>{' '}
              endpoint at <code className="rounded bg-muted px-1">NESTJS_API_URL</code> (default http://localhost:4000). Reported as unknown when the
              service is not deployed.
            </li>
            <li>
              <span className="font-medium text-foreground">PostgreSQL</span> — runs a trivial query through the shared connection pool.
            </li>
            <li>
              <span className="font-medium text-foreground">Redis</span> — sends a RESP <code className="rounded bg-muted px-1">PING</code> to{' '}
              <code className="rounded bg-muted px-1">REDIS_URL</code>. No credentials are shown.
            </li>
            <li>
              <span className="font-medium text-foreground">Background worker</span> — there is no worker heartbeat endpoint, so this is an
              activity-derived signal: recent <code className="rounded bg-muted px-1">sync_runs</code> while connected accounts exist. Last recorded
              run: {formatRelative(signal.lastRunAt)} ({formatDateTime(signal.lastRunAt)}). Connected accounts: {signal.connectedAccounts}.
            </li>
          </ul>
          <p className="mt-4 text-xs">Checked at {formatDateTime(new Date().toISOString())}. No connection strings, environment values or stack traces are exposed.</p>
        </CardContent>
      </Card>
    </>
  );
}
