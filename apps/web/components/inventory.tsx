'use client';
import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, Download, Info, PlayCircle, Search } from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { useChartReveal } from '@/lib/chart-animate';
import { fetchInventory, type InventoryRow } from '@/lib/api';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const initials = (name: string) => name.slice(0, 2).toUpperCase();
const covColor = (d: number) => (d < 14 ? 'text-red-600 dark:text-red-500' : d < 30 ? 'text-amber-600 dark:text-amber-500' : 'text-primary');
const covDot = (d: number) => (d < 14 ? 'bg-red-600 dark:bg-red-500' : d < 30 ? 'bg-amber-500' : 'bg-primary');
const shortDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('pp-skeleton', className)} style={style} />;
}

export function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<InventoryRow[]>([]);
  const [tab, setTab] = useState(0);
  const [code, setCode] = useState('All');
  const [codeOpen, setCodeOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchInventory().then((rows) => {
      if (cancelled) return;
      setProducts(rows ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const CODES = ['All', ...Array.from(new Set(products.map((p) => p.code)))];

  const q = search.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (code === 'All' || p.code === code) &&
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.child.toLowerCase().includes(q)),
  );

  const rows = filtered.map((p) => ({
    ...p,
    totalFba: p.sellable + p.reserved + p.pending,
  }));

  const sum = (k: keyof InventoryRow) => filtered.reduce((a, p) => a + (p[k] as number), 0);
  const totalSold = sum('sold30');
  const totalFbaUnits = filtered.reduce((a, p) => a + p.sellable + p.reserved + p.pending, 0);
  const codeSet = new Set(filtered.map((p) => p.code));
  const total = {
    sellable: sum('sellable'),
    reserved: sum('reserved'),
    pending: sum('pending'),
    totalFba: totalFbaUnits,
    unsellable: sum('unsellable'),
    value: sum('value'),
    sold30: totalSold,
    dailyAvg: (totalSold / 30).toFixed(2),
    daysCoverage:
      totalSold > 0 ? Math.round(filtered.reduce((a, p) => a + p.sellable + p.pending, 0) / (totalSold / 30)) : '∞',
    codeCount: `${codeSet.size} code${codeSet.size === 1 ? '' : 's'}`,
  };

  const maxDaily = Math.max(0.01, ...filtered.map((p) => p.sold30 / 30));
  const velocity = filtered
    .slice()
    .sort((a, b) => b.sold30 - a.sold30)
    .map((p) => {
      const dv = p.sold30 / 30;
      return { ...p, dailyAvg: dv.toFixed(2), pct: Math.round((dv / maxDaily) * 100) };
    });

  // Aggregate each filtered product's real 30-day daily series into one combined series.
  const dateMap = new Map<string, { units: number; stock: number }>();
  for (const p of filtered) {
    for (const d of p.daily) {
      const cur = dateMap.get(d.date) ?? { units: 0, stock: 0 };
      cur.units += d.units;
      cur.stock += d.stock;
      dateMap.set(d.date, cur);
    }
  }
  const sortedDates = Array.from(dateMap.keys()).sort();
  const units = sortedDates.length ? sortedDates.map((d) => dateMap.get(d)!.units) : [0];
  const stock = sortedDates.length ? sortedDates.map((d) => dateMap.get(d)!.stock) : [0];

  const uMaxRaw = Math.max(10, ...units);
  const uMax = Math.ceil(uMaxRaw / 50) * 50;
  const sMin = Math.min(...stock);
  const sMaxRaw = Math.max(...stock);
  const sPad = Math.max(50, Math.round((sMaxRaw - sMin) * 0.15));
  const sLo = Math.max(0, Math.floor((sMin - sPad) / 100) * 100);
  const sHi = Math.ceil((sMaxRaw + sPad) / 100) * 100;
  const kfmt = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(v));
  const stockTop = (v: number) => (sHi === sLo ? 50 : (1 - (v - sLo) / (sHi - sLo)) * 100);
  const leftTicks = Array.from({ length: 6 }, (_, k) => ({ top: `${(k / 5) * 100}%`, label: Math.round(uMax - (k / 5) * uMax) }));
  const rightTicks = Array.from({ length: 6 }, (_, k) => ({ top: `${(k / 5) * 100}%`, label: kfmt(Math.round(sHi - (k / 5) * (sHi - sLo))) }));
  const maxUnitIdx = units.indexOf(Math.max(...units));
  const lastIdx = units.length - 1;
  const chartDays = units.map((u, i) => ({
    units: u,
    h: (u / uMax) * 100,
    stockTopPct: stockTop(stock[i] ?? 0),
    showLabel: i === maxUnitIdx || i === 0,
    showStockLabel: i === 0 || i === lastIdx,
    stockLabel: kfmt(stock[i] ?? 0),
  }));
  const linePoints = stock.map((v, i) => `${(((i + 0.5) / stock.length) * 100).toFixed(2)},${stockTop(v).toFixed(2)}`).join(' ');
  const xLabels = [0, 6, 12, 18, 24, lastIdx].map((i) => (sortedDates[Math.min(i, lastIdx)] ? shortDate(sortedDates[Math.min(i, lastIdx)]!) : ''));
  const snapshotDate = sortedDates.length ? shortDate(sortedDates[sortedDates.length - 1]!) : '—';

  const velocityRef = useChartReveal<HTMLDivElement>([loading, tab, code]);
  const stockChartRef = useChartReveal<HTMLDivElement>([loading, code]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">FBA Inventory</h1>
          <span className="flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-border text-muted-foreground">
            <Info className="size-3.5" />
          </span>
          <a href="#" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-primary">
            <PlayCircle className="size-[15px]" />
            Video guide
          </a>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="relative">
            <button
              onClick={() => setCodeOpen((v) => !v)}
              className="flex min-w-[220px] items-center justify-between gap-10 rounded-xl border border-border bg-card px-3.5 pb-2.5 pt-[22px] text-sm font-bold text-foreground transition hover:border-foreground/20"
            >
              <span className="absolute left-3.5 top-2 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground/70">Product Code</span>
              {code}
              <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', codeOpen && 'rotate-180')} />
            </button>
            {codeOpen && (
              <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[220px] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-2xl">
                {CODES.map((c) => (
                  <div
                    key={c}
                    onClick={() => {
                      setCode(c);
                      setCodeOpen(false);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] transition hover:bg-muted',
                      c === code ? 'font-bold text-foreground bg-muted' : 'font-medium text-foreground/80',
                    )}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-[13px] font-semibold text-muted-foreground">
            Last Stock Snapshot: <span className="font-extrabold text-foreground">{snapshotDate}</span>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-0.5 rounded-[11px] border border-border bg-card p-[3px]">
          {['Overview', 'Velocity'].map((label, i) => (
            <button
              key={label}
              onClick={() => setTab(i)}
              className={cn(
                'whitespace-nowrap rounded-lg px-4.5 py-2 text-[13px] font-medium transition-all',
                tab === i ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[240px] max-w-[460px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name / sku / asin"
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-3.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          />
        </div>
        <button className="ml-auto flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground/80 transition hover:border-primary hover:text-primary">
          <Download className="size-4" />
          Export
        </button>
      </div>

      {loading ? (
        <>
          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="mb-3.5 h-11 w-full" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="mb-2.5 h-[58px] w-full" />
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5.5">
            <Skeleton className="mb-6 h-4 w-64" />
            <div className="flex h-60 items-end gap-[1.5%]">
              {['52%', '48%', '66%', '58%', '72%', '80%', '62%', '55%', '68%', '74%', '60%', '50%', '70%', '78%', '64%', '56%', '72%', '82%', '66%', '58%', '54%', '76%', '68%', '46%'].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-t" style={{ height: h }} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {tab === 0 && (
            <div className="mb-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <div className="grid min-w-[1320px] grid-cols-[minmax(260px,1.7fr)_repeat(5,minmax(84px,0.8fr))_minmax(112px,1fr)_repeat(3,minmax(92px,0.9fr))_minmax(96px,0.85fr)]">
                <div className="border-b border-border" />
                <div className="col-span-5 flex items-center justify-center border-b border-border bg-muted/60 p-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Stock Units
                </div>
                <div className="flex items-center justify-center border-b border-border bg-primary/10 p-2.5 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                  Capital
                </div>
                <div className="col-span-3 flex items-center justify-center border-b border-border bg-amber-500/10 p-2.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-500">
                  Sales &amp; Coverage
                </div>
                <div className="flex items-center justify-center border-b border-border bg-muted/40 p-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Code
                </div>

                {['Product', 'Sellable', 'Reserved', 'Inbound Pending', 'Total FBA', 'Unsellable', 'Inventory Value', 'Last 30d Sales', 'AVG Daily Sales', 'Days Coverage', 'Product Code'].map(
                  (h, i) => (
                    <div
                      key={h}
                      className={cn(
                        'border-b border-border p-3.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground',
                        (i === 6 || i === 7 || i === 10) && 'border-l border-border/60',
                        i === 6 && 'bg-primary/5',
                        i === 0 && 'sticky left-0 z-[1] bg-card',
                      )}
                    >
                      {h}
                    </div>
                  ),
                )}

                {rows.map((p) => (
                  <Fragment key={p.sku}>
                    <div className="sticky left-0 z-[1] flex items-center gap-3 border-b border-border/60 bg-card p-4">
                      <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[9px] border border-border bg-muted/40 text-xs font-extrabold text-muted-foreground/40">
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-foreground">{p.name}</div>
                        <div className="truncate text-[11.5px] font-semibold text-muted-foreground">{p.sku}</div>
                      </div>
                    </div>
                    <div className={cn('flex items-center border-b border-border/60 p-3 text-sm font-bold', p.sellable === 0 ? 'text-red-600 dark:text-red-500' : 'text-foreground')}>
                      {p.sellable}
                    </div>
                    <div className="flex items-center border-b border-border/60 p-3 text-sm font-bold text-foreground/80">{p.reserved}</div>
                    <div className="flex items-center border-b border-border/60 p-3 text-sm font-bold text-foreground/80">{p.pending}</div>
                    <div className="flex items-center border-b border-border/60 p-3 text-sm font-extrabold text-foreground">{p.totalFba}</div>
                    <div className={cn('flex items-center border-b border-border/60 p-3 text-sm font-bold', p.unsellable > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-muted-foreground')}>
                      {p.unsellable}
                    </div>
                    <div className="flex items-center border-b border-l border-border/60 bg-primary/5 p-3 text-[15px] font-extrabold tracking-tight text-primary">
                      {fmt(p.value)}
                    </div>
                    <div className="flex items-center border-b border-l border-border/60 p-3 text-sm font-bold text-foreground/80">{p.sold30}</div>
                    <div className="flex items-center border-b border-border/60 p-3 text-sm font-bold text-foreground/80">{(p.sold30 / 30).toFixed(2)}</div>
                    <div className="flex items-center gap-2 border-b border-border/60 p-3">
                      <span className={cn('size-[7px] shrink-0 rounded-full', covDot(p.daysCoverage))} />
                      <span className="text-sm font-bold text-foreground/80">{p.daysCoverage}</span>
                    </div>
                    <div className="flex items-center border-b border-l border-border/60 p-3">
                      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-extrabold tracking-wide text-muted-foreground">{p.code}</span>
                    </div>
                  </Fragment>
                ))}

                <div className="sticky left-0 z-[1] flex items-center bg-muted/40 p-4.5 text-[13px] font-extrabold uppercase tracking-wide text-foreground">Total</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.sellable}</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.reserved}</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.pending}</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.totalFba}</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.unsellable}</div>
                <div className="flex items-center border-l border-border/60 bg-primary/10 p-3 text-base font-extrabold tracking-tight text-primary">{fmt(total.value)}</div>
                <div className="flex items-center border-l border-border/60 bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.sold30}</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.dailyAvg}</div>
                <div className="flex items-center bg-muted/40 p-3 text-[15px] font-extrabold text-foreground">{total.daysCoverage}</div>
                <div className="flex items-center border-l border-border/60 bg-muted/40 p-3 text-[13px] font-bold text-muted-foreground">{total.codeCount}</div>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div ref={velocityRef} className="mb-6 rounded-2xl border border-border bg-card p-1">
              <div className="flex items-center gap-4 border-b border-border/60 px-5.5 py-3.5">
                <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Product</span>
                <span className="w-[120px] text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Sell-through</span>
                <span className="w-[78px] text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Daily avg</span>
                <span className="w-24 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Days cover</span>
              </div>
              {velocity.map((p) => (
                <div key={p.sku} className="flex items-center gap-4 border-b border-border/50 px-5.5 py-4 transition last:border-b-0 hover:bg-muted/30">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[9px] border border-border bg-muted/40 text-xs font-extrabold text-muted-foreground/40">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-foreground">{p.name}</div>
                      <div className="truncate text-[11.5px] font-semibold text-muted-foreground">{p.sold30} sold · {p.code}</div>
                    </div>
                  </div>
                  <div className="w-[120px]">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div data-chart-hbar className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                  <div className="w-[78px] text-right text-[15px] font-extrabold tracking-tight text-amber-700 dark:text-amber-500">{p.dailyAvg}</div>
                  <div className="flex w-24 items-center justify-end gap-2">
                    <span className={cn('size-[7px] rounded-full', covDot(p.daysCoverage))} />
                    <span className="text-[15px] font-extrabold text-foreground">{p.daysCoverage}d</span>
                  </div>
                </div>
              ))}
              {velocity.length === 0 && (
                <div className="p-10 text-center text-sm font-semibold text-muted-foreground">No products match your filters.</div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5.5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-extrabold tracking-tight">Last 30 days · Stock vs Sales</h2>
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                  <span className="size-3 rounded-[3px] bg-amber-500" /> Units Sold
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                  <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
                    <line x1="1" y1="6" x2="25" y2="6" stroke="var(--primary)" strokeWidth={2} />
                    <circle cx="13" cy="6" r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth={2} />
                  </svg>
                  FBA Stock
                </span>
              </div>
            </div>
            <div className="relative mt-1 h-[300px]">
              <div className="absolute left-0 top-0 bottom-[22px] w-9">
                {leftTicks.map((t, i) => (
                  <div key={i} className="absolute right-1.5 -translate-y-1/2 text-right text-[11px] font-semibold text-muted-foreground" style={{ top: t.top }}>
                    {t.label}
                  </div>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-[22px] w-11">
                {rightTicks.map((t, i) => (
                  <div key={i} className="absolute left-1.5 -translate-y-1/2 text-[11px] font-semibold text-primary/80" style={{ top: t.top }}>
                    {t.label}
                  </div>
                ))}
              </div>
              <div ref={stockChartRef} className="absolute left-11 right-[50px] top-0 bottom-[22px]">
                {leftTicks.map((t, i) => (
                  <div key={i} className="absolute inset-x-0 h-px bg-border/60" style={{ top: t.top }} />
                ))}
                <div className="absolute inset-0 flex items-end gap-[1.4%]">
                  {chartDays.map((d, i) => (
                    <div key={i} className="relative h-full flex-1">
                      <div data-chart-bar className="absolute inset-x-[18%] bottom-0 rounded-t bg-amber-500" style={{ height: `${d.h}%` }} />
                      {d.showLabel && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-amber-700 dark:text-amber-500"
                          style={{ bottom: `calc(${d.h}% + 4px)` }}
                        >
                          {d.units}
                        </div>
                      )}
                      <div
                        className="absolute left-1/2 z-[3] size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card"
                        style={{ top: `${d.stockTopPct}%` }}
                      />
                      {d.showStockLabel && (
                        <div
                          className="absolute left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap rounded bg-card px-1.5 py-0.5 text-[10px] font-extrabold text-primary shadow"
                          style={{ top: `${d.stockTopPct}%`, transform: 'translate(-50%,-140%)' }}
                        >
                          {d.stockLabel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <polyline points={linePoints} fill="none" stroke="var(--primary)" strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
              <div className="absolute left-11 right-[50px] bottom-0 flex h-[22px] items-center">
                {xLabels.map((x, i) => (
                  <span key={i} className="flex-1 text-center text-[11px] font-semibold text-muted-foreground">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
