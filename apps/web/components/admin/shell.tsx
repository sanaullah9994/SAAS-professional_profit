'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Activity,
  Building2,
  ChevronLeft,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plug,
  ScrollText,
  Settings as SettingsIcon,
  Sun,
  Users,
  X,
  History,
} from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { LogoMark } from '@/components/marketing/logo';
import { authClient } from '@/lib/auth-client';

type NavLink = { href: string; label: string; icon: typeof Users };

const navLinks: NavLink[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/connections', label: 'Connections', icon: Plug },
  { href: '/admin/sync-jobs', label: 'Sync Jobs', icon: History },
  { href: '/admin/system-health', label: 'System Health', icon: Activity },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

function isActive(path: string, href: string): boolean {
  if (href === '/admin') return path === '/admin';
  return path === href || path.startsWith(`${href}/`);
}

function NavItems({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {navLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted',
            isActive(path, href) && 'bg-muted font-bold text-foreground',
          )}
        >
          <Icon className={cn('size-[18px]', isActive(path, href) && 'text-primary')} strokeWidth={1.8} />
          <span className="flex-1">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setMobileOpen(false), [path]);

  async function logOut() {
    await authClient.signOut();
    router.push('/login');
  }

  const themeButton = (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      disabled={!mounted}
      aria-label="Toggle color theme"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {mounted && resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col gap-6 overflow-y-auto border-r border-border bg-card px-4 py-5 lg:flex">
        <div className="flex items-center gap-2 px-1">
          <LogoMark size={22} />
          <span className="text-[17px] font-extrabold tracking-tight">ProfitPilot</span>
          <span className="rounded-md bg-foreground/5 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Admin
          </span>
        </div>

        <NavItems path={path} />

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            <ChevronLeft className="size-[18px]" strokeWidth={1.8} />
            Customer dashboard
          </Link>
          <button
            onClick={logOut}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            <LogOut className="size-[18px]" strokeWidth={1.8} />
            Log out
          </button>
          <div className="flex items-center justify-end pt-1">{themeButton}</div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[272px] flex-col gap-5 overflow-y-auto border-r border-border bg-card px-4 py-5">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-2">
                <LogoMark size={20} />
                <span className="text-base font-extrabold tracking-tight">ProfitPilot Admin</span>
              </span>
              <button
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavItems path={path} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                <ChevronLeft className="size-[18px]" strokeWidth={1.8} />
                Customer dashboard
              </Link>
              <button
                onClick={logOut}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                <LogOut className="size-[18px]" strokeWidth={1.8} />
                Log out
              </button>
              <div className="flex items-center justify-end pt-1">{themeButton}</div>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
          >
            <Menu className="size-4" />
          </button>
          <span className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
            <Gauge className="size-4 text-primary" />
            ProfitPilot Admin
          </span>
        </div>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
