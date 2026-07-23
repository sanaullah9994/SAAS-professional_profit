'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Calculator,
  ChevronDown,
  FileText,
  Gauge,
  Gift,
  Hash,
  LogOut,
  Moon,
  Package,
  Search,
  Settings as SettingsIcon,
  Shapes,
  Sun,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { LogoMark } from '@/components/marketing/logo';
import { authClient } from '@/lib/auth-client';

type NavLink = { href: string; label: string; icon: typeof BarChart3; badge?: 'new' | 'warning' };

const coreLinks: NavLink[] = [
  { href: '/dashboard', label: 'Profit Dashboard', icon: BarChart3 },
  { href: '/profit-calculator', label: 'Profit Calculator', icon: Calculator },
  { href: '/fba-inventory', label: 'FBA Inventory', icon: Boxes },
  { href: '/traffic-analytics', label: 'Traffic Analytics', icon: TrendingUp },
];

const advancedLinks: NavLink[] = [
  { href: '/keyword-frequency', label: 'Keyword Frequency', icon: Search },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/performance', label: 'Performance', icon: Gauge },
];

const setupLinks: NavLink[] = [
  { href: '/products-cogs', label: 'Products and COGS', icon: Boxes, badge: 'warning' },
  { href: '/plan-setup', label: 'Plan Setup & Upload', icon: Upload },
  { href: '/custom-categories', label: 'Custom Categories', icon: Shapes },
  { href: '/manual-expenses', label: 'Manual Expenses', icon: FileText },
  { href: '/search-term-tags', label: 'Search Term Tags', icon: Hash },
];

const accountLinks: NavLink[] = [
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
  { href: '/user-permissions', label: 'User Permissions', icon: Users, badge: 'new' },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/refer-earn', label: 'Refer & Earn', icon: Gift },
];

function NavGroup({ title, links, path }: { title: string; links: NavLink[]; path: string }) {
  return (
    <div>
      <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">{title}</div>
      <div className="flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted',
              path === href && 'bg-muted font-bold text-foreground',
            )}
          >
            <Icon className={cn('size-[18px]', path === href && 'text-primary')} strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            {badge === 'warning' && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
            {badge === 'new' && (
              <span className="shrink-0 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-violet-600 dark:text-violet-400">
                NEW
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function logOut() {
    await authClient.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col gap-6 overflow-y-auto border-r border-border bg-card px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-1">
          <LogoMark size={22} />
          <span className="text-[17px] font-extrabold tracking-tight">ProfitPilot</span>
        </Link>

        <div className="flex flex-col gap-3.5">
          <div>
            <div className="mb-1.5 px-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Seller</div>
            <button className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-muted/40 px-3 py-2.5 text-[13.5px] font-semibold text-foreground/80 transition hover:border-foreground/20">
              <span className="truncate">Commercial Plastics</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </div>
          <div>
            <div className="mb-1.5 px-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Marketplace</div>
            <button className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-muted/40 px-3 py-2.5 text-[13.5px] font-semibold text-foreground/80 transition hover:border-foreground/20">
              <span className="truncate">United States</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5">
          <NavGroup title="Core" links={coreLinks} path={path} />
          <NavGroup title="Advanced" links={advancedLinks} path={path} />
          <NavGroup title="Setup Tools" links={setupLinks} path={path} />
          <div>
            <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Account</div>
            <div className="flex flex-col gap-0.5">
              {accountLinks.map(({ href, label, icon: Icon, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted',
                    path === href && 'bg-muted font-bold text-foreground',
                  )}
                >
                  <Icon className={cn('size-[18px]', path === href && 'text-primary')} strokeWidth={1.8} />
                  <span className="flex-1">{label}</span>
                  {badge === 'new' && (
                    <span className="shrink-0 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-violet-600 dark:text-violet-400">
                      NEW
                    </span>
                  )}
                </Link>
              ))}
              <button
                onClick={logOut}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                <LogOut className="size-[18px]" strokeWidth={1.8} />
                Log Out
              </button>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground/70">
            CP
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-foreground/80">Commercial Plastics</div>
            <div className="text-[11px] font-medium text-muted-foreground">Seller account</div>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
