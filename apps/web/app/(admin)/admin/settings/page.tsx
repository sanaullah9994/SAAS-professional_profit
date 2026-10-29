import { getPlatformSettingRows } from '@amazon-profit/db';
import { Card, CardContent, CardHeader, CardTitle } from '@amazon-profit/ui';
import { AdminPageHeader } from '@/components/admin/ui';
import { formatDateTime } from '@/components/admin/format';
import { SettingsForm } from '@/components/admin/settings-form';
import { requirePlatformAdminPage } from '@/lib/admin-auth';
import { getPlatformSettings, SETTING_DEFINITIONS } from '@/lib/admin-settings';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Platform Settings · Admin · ProfitPilot' };

export default async function AdminSettingsPage() {
  await requirePlatformAdminPage();
  const [settings, rows] = await Promise.all([getPlatformSettings(), getPlatformSettingRows()]);
  const updatedBy = new Map(rows.map((row) => [row.key, row]));

  const values: Record<string, string | boolean | number> = {
    signups_enabled: settings.signupsEnabled,
    sync_retry_enabled: settings.syncRetryEnabled,
    active_user_window_days: settings.activeUserWindowDays,
  };

  return (
    <>
      <AdminPageHeader
        title="Platform Settings"
        description="Only settings with real server-side enforcement appear here. Every change is validated, saved transactionally and audited."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]}
      />

      <SettingsForm
        definitions={SETTING_DEFINITIONS.map(({ key: _key, ...rest }) => rest)}
        values={values}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Stored values</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="h-10 px-3 text-left font-medium text-muted-foreground">Key</th>
                  <th className="h-10 px-3 text-left font-medium text-muted-foreground">Value</th>
                  <th className="h-10 px-3 text-left font-medium text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SETTING_DEFINITIONS.map((definition) => {
                  const row = updatedBy.get(definition.dbKey);
                  return (
                    <tr key={definition.dbKey}>
                      <td className="px-3 py-2.5 font-mono text-xs">{definition.dbKey}</td>
                      <td className="px-3 py-2.5">{String(values[definition.key])}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {row ? `${formatDateTime(row.updated_at)}${row.updated_by ? ` · by ${row.updated_by}` : ''}` : 'default'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs">
            Feature ideas with no enforcement point (billing controls, plan limits) are intentionally absent — adding a toggle without server-side
            behavior would be misleading.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
