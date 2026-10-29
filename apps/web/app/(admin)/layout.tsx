import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';
import { requirePlatformAdminPage } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'Admin · ProfitPilot',
  description: 'Platform administration for ProfitPilot',
};

// Every page under (admin)/ passes through this layout, which performs the
// real server-side authorization (session validated against the database plus
// platform_role / allowlist check). Individual pages call
// requirePlatformAdminPage() again as defense in depth. middleware.ts only
// checks session-cookie presence for these routes.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
