'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Pencil, RefreshCw, Search } from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { AccountSecurity } from '@/components/auth/account-security';

type Account = { name: string; marketplace: string; spApi: 'Active' | 'Expired'; adApi: 'Active' | 'Expired' };

// TODO: replace with connected Amazon accounts from the DB
const ACCOUNTS: Account[] = [
  '360 Nutrition', 'Age With Ease', 'Aloe Attiva', 'Amber NaturalZ', 'Asozi',
  'Awkward Essentials', 'BE+Well', 'Beast Sports Nutrition', 'Cymbiotika', 'Nature Made',
  'Optimum Nutrition', 'Pure Encapsulations', 'Thorne',
].map((name, i) => ({ name, marketplace: 'North America', spApi: 'Active', adApi: i === 4 ? 'Expired' : 'Active' }) as Account);

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pp-skeleton', className)} />;
}

function StatusBadge({ status }: { status: 'Active' | 'Expired' }) {
  return (
    <span
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-extrabold',
        status === 'Active' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
      )}
    >
      {status}
    </span>
  );
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [spinning, setSpinning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  function refresh(key: string) {
    setSpinning((s) => ({ ...s, [key]: true }));
    setTimeout(() => setSpinning((s) => { const next = { ...s }; delete next[key]; return next; }), 900);
  }

  const q = search.trim().toLowerCase();
  const filtered = ACCOUNTS.filter((a) => !q || a.name.toLowerCase().includes(q));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-extrabold tracking-tight">Accounts</h1>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          Connect Amazon Account
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>

      <div className="relative mb-4.5 max-w-[420px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by a seller name…"
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-3.5 text-sm font-medium text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="mb-9 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="min-w-[760px] overflow-x-auto">
          <div className="grid grid-cols-[minmax(200px,1.4fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)] items-center border-b border-border px-6 py-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <span>Seller Name</span>
            <span>Marketplace</span>
            <span>Selling Partner API</span>
            <span>Advertising API</span>
          </div>

          {loading ? (
            <div className="px-6 py-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="mb-2.5 h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              {filtered.map((a) => {
                const spKey = `${a.name}-sp`;
                const adKey = `${a.name}-ad`;
                return (
                  <div
                    key={a.name}
                    className="grid grid-cols-[minmax(200px,1.4fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)] items-center border-b border-border/60 px-6 py-4 transition hover:bg-muted/20 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{a.name}</span>
                      <button className="flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-border bg-card transition hover:border-primary">
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <span className="text-[13.5px] font-semibold text-muted-foreground">{a.marketplace}</span>
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={a.spApi} />
                      <button
                        onClick={() => refresh(spKey)}
                        className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary"
                      >
                        <RefreshCw className={cn('size-3.5', spinning[spKey] && 'animate-spin')} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={a.adApi} />
                      <button
                        onClick={() => refresh(adKey)}
                        className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary"
                      >
                        <RefreshCw className={cn('size-3.5', spinning[adKey] && 'animate-spin')} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-12 text-center text-sm font-semibold text-muted-foreground">No sellers match your search.</div>
              )}
            </>
          )}
        </div>
      </div>

      <h2 className="mb-4.5 text-2xl font-extrabold tracking-tight">Subscription</h2>
      <div className="mb-6 max-w-[420px] rounded-2xl border border-border bg-card px-5.5">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 py-4">
          <span className="text-sm font-semibold text-muted-foreground">Status</span>
          <span className="rounded-lg bg-primary/10 px-3.5 py-1.5 text-xs font-extrabold text-primary">Active</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 py-4">
          <span className="text-sm font-semibold text-muted-foreground">Card details</span>
          <span className="text-sm font-bold text-muted-foreground/60">—</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 py-4">
          <span className="text-sm font-semibold text-muted-foreground">Next billing</span>
          <span className="text-sm font-extrabold text-foreground">26 Aug 2026</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-4">
          <span className="text-sm font-semibold text-muted-foreground">Price</span>
          <span className="text-sm font-extrabold text-foreground">$0.00</span>
        </div>
        <div className="flex justify-end pb-4.5 pt-1.5">
          <button className="rounded-xl border border-border bg-card px-5 py-2.5 text-[13.5px] font-bold text-muted-foreground transition hover:border-red-600 hover:text-red-600">
            Unsubscribe
          </button>
        </div>
      </div>

      <div className="mb-9">
        <a href="#" className="text-[13px] font-semibold text-primary transition hover:opacity-80">
          Cookie Settings
        </a>
      </div>

      <AccountSecurity />
    </div>
  );
}
