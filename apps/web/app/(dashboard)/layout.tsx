import { Shell } from '@/components/shell';
import { getPlatformAdminGate } from '@/lib/admin-auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Server-side check so the Admin nav item only renders for platform owners;
  // /admin itself re-checks authorization on every request.
  const gate = await getPlatformAdminGate();
  return <Shell isAdmin={gate.status === 'ok'}>{children}</Shell>;
}
