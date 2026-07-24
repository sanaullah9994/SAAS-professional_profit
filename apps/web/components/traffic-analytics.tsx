'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Filter,
  PlayCircle,
  Search,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ShoppingCart } from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@amazon-profit/utils';
import { fetchTrafficRaw, type TrafficRawRow } from '@/lib/api';

const ranges = ['Last 7 days', 'Last 14 days', 'This month', 'Last month', 'Custom range'];
const rangeDays = [7, 14, 30, 60, 90];
const LINE_COLOR = '#e8998f';

type CatalogEntry = {
  productId: string;
  sku: string;
  asin: string;
  title: string;
  initials: string;
  org: number;
  paid: number;
  units: number;
  revenue: number;
  adSpend: number;
  usp: string;
  tacos: string;
};

function buildCatalog(rows: TrafficRawRow[]): CatalogEntry[] {
  const map = new Map<string, Omit<CatalogEntry, 'initials' | 'usp' | 'tacos'>>();
  for (const r of rows) {
    let e = map.get(r.productId);
    if (!e) {
      e = { productId: r.productId, sku: r.sku, asin: r.asin, title: r.title, org: 0, paid: 0, units: 0, revenue: 0, adSpend: 0 };
      map.set(r.productId, e);
    }
    e.org += r.organicSessions;
    e.paid += r.paidSessions;
    e.units += r.units;
    e.revenue += r.revenue;
    e.adSpend += r.adSpend;
  }
  return Array.from(map.values()).map((e) => {
    const sessions = e.org + e.paid;
    return {
      ...e,
      initials: e.title.slice(0, 2).toUpperCase(),
      usp: sessions > 0 ? ((e.units / sessions) * 100).toFixed(2) + '%' : '0.00%',
      tacos: e.revenue > 0 ? ((e.adSpend / e.revenue) * 100).toFixed(2) + '%' : '—',
    };
  });
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('pp-skeleton', className)} style={style} />;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px]',
        checked ? 'border-primary bg-primary' : 'border-border bg-card',
      )}
    >
      {checked && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName,
  icon: Icon,
  leftLabel,
  leftValue,
  leftClassName,
  rightLabel,
  rightValue,
  rightClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon: LucideIcon;
  leftLabel: string;
  leftValue: string;
  leftClassName?: string;
  rightLabel: string;
  rightValue: string;
  rightClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-foreground/15">
      <div className="mb-3.5 flex items-start justify-between">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={cn('text-[32px] font-extrabold leading-none tracking-tight', valueClassName)}>{value}</div>
        </div>
        <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-border">
          <Icon className="size-[18px] text-foreground/70" strokeWidth={1.7} />
        </div>
      </div>
      <div className="mb-3 h-px bg-border" />
      <div className="flex justify-between gap-3">
        <div>
          <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">{leftLabel}</div>
          <div className={cn('text-sm font-bold text-foreground/80', leftClassName)}>{leftValue}</div>
        </div>
        <div className="text-right">
          <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">{rightLabel}</div>
          <div className={cn('text-sm font-bold text-foreground/80', rightClassName)}>{rightValue}</div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="border-l border-border/70 px-4">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div className={cn('mt-1.5 text-[21px] font-extrabold leading-none tracking-tight', valueClassName)}>{value}</div>
    </div>
  );
}

export function TrafficAnalytics() {
  const [range, setRange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rawRows, setRawRows] = useState<TrafficRawRow[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTrafficRaw(rangeDays[range] ?? 30).then((rows) => {
      if (cancelled) return;
      const data = rows ?? [];
      setRawRows(data);
      const ids = Array.from(new Set(data.map((r) => r.productId)));
      setSelected(ids.map(() => true));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  function toggleProduct(i: number) {
    setSelected((s) => s.map((v, idx) => (idx === i ? !v : v)));
  }

  function toggleAll() {
    setSelected((s) => {
      const allOn = s.every(Boolean);
      return s.map(() => !allOn);
    });
  }

  const catalog = buildCatalog(rawRows);
  const chosen = catalog.filter((_, i) => selected[i]);
  const chosenIds = new Set(chosen.map((c) => c.productId));
  const sessOrg = chosen.reduce((a, p) => a + p.org, 0);
  const sessPaid = chosen.reduce((a, p) => a + p.paid, 0);
  const sessions = sessOrg + sessPaid;
  const salesTotal = chosen.reduce((a, p) => a + p.revenue, 0);
  const units = chosen.reduce((a, p) => a + p.units, 0);
  const uspVal = sessions > 0 ? ((units / sessions) * 100).toFixed(2) + '%' : '0.00%';

  const hasData = sessions > 0;
  const allDates = Array.from(new Set(rawRows.map((r) => r.date))).sort();
  const chartDates = allDates.slice(-7);
  const chartDays = chartDates.map((date) => {
    const rowsForDate = rawRows.filter((r) => r.date === date && chosenIds.has(r.productId));
    const org = rowsForDate.reduce((a, r) => a + r.organicSessions, 0);
    const paid = rowsForDate.reduce((a, r) => a + r.paidSessions, 0);
    const dayUnits = rowsForDate.reduce((a, r) => a + r.units, 0);
    const daySessions = org + paid;
    return { date, org, paid, usp: daySessions > 0 ? (dayUnits / daySessions) * 100 : 0 };
  });

  const maxTotal = Math.max(10, ...chartDays.map((d) => d.org + d.paid));
  const sMax = Math.ceil(maxTotal / 10) * 10;
  const uMax = Math.max(20, Math.ceil(Math.max(0, ...chartDays.map((d) => d.usp)) / 5) * 5);
  const leftTicks = Array.from({ length: 6 }, (_, k) => ({
    top: `${(k / 5) * 100}%`,
    label: Math.round(sMax - (k / 5) * sMax),
  }));
  const rightTicks = Array.from({ length: 5 }, (_, k) => {
    const v = Math.round(uMax - (k / 4) * uMax);
    return { top: `${(k / 4) * 100}%`, label: `${v}%` };
  });
  const mTop = (v: number) => ((uMax - Math.max(0, Math.min(uMax, v))) / uMax) * 100;
  const days = chartDays.map((d) => ({
    label: shortDate(d.date),
    pd: d.paid,
    orgPct: (d.org / sMax) * 100,
    paidPct: (d.paid / sMax) * 100,
    show: hasData && d.org + d.paid > 0,
    dotTop: mTop(d.usp),
  }));
  const linePoints = hasData
    ? chartDays.map((d, i) => `${(((i + 0.5) / Math.max(1, chartDays.length)) * 100).toFixed(2)},${mTop(d.usp).toFixed(2)}`).join(' ')
    : '';

  const pq = prodSearch.trim().toLowerCase();
  const products = chosen.filter(
    (p) => !pq || p.title.toLowerCase().includes(pq) || p.asin.toLowerCase().includes(pq) || p.sku.toLowerCase().includes(pq),
  );

  const fq = filterSearch.trim().toLowerCase();
  const visibleProducts = catalog
    .map((p, index) => ({ ...p, index }))
    .filter((p) => !fq || p.title.toLowerCase().includes(fq) || p.sku.toLowerCase().includes(fq) || p.asin.toLowerCase().includes(fq));
  const selectedCount = selected.filter(Boolean).length;
  const allSelected = selected.length > 0 && selected.every(Boolean);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">Traffic</h1>
          <a href="#" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-primary">
            <PlayCircle className="size-[15px]" />
            Video guide
          </a>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-[11px] border border-border bg-card p-[3px]">
          {ranges.map((label, i) => (
            <button
              key={label}
              onClick={() => setRange(i)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all',
                range === i ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3.5 flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="mb-3 h-[11px] w-14" />
                  <Skeleton className="h-7 w-28" />
                </div>
                <Skeleton className="size-[38px] rounded-[10px]" />
              </div>
              <div className="mb-3 h-px bg-border" />
              <div className="flex justify-between gap-3">
                <div className="flex-1">
                  <Skeleton className="mb-1.5 h-[9px] w-12" />
                  <Skeleton className="h-3.5 w-18" />
                </div>
                <div className="flex flex-1 flex-col items-end">
                  <Skeleton className="mb-1.5 h-[9px] w-12" />
                  <Skeleton className="h-3.5 w-18" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <SummaryCard
            label="Sessions"
            value={String(sessions)}
            icon={Users}
            leftLabel="Organic Traffic"
            leftValue={`${sessOrg} · ${formatPercent(sessions ? (sessOrg / sessions) * 100 : 0)}`}
            leftClassName="text-primary"
            rightLabel="Paid Traffic"
            rightValue={`${sessPaid} · ${formatPercent(sessions ? (sessPaid / sessions) * 100 : 0)}`}
            rightClassName="text-amber-600 dark:text-amber-500"
          />
          <SummaryCard
            label="Sales"
            value={formatCurrency(salesTotal)}
            icon={ShoppingCart}
            leftLabel="Units Sold"
            leftValue={String(units)}
            rightLabel="Avg Order Value"
            rightValue={formatCurrency(units ? salesTotal / units : 0)}
          />
          <SummaryCard
            label="Unit Session %"
            value={uspVal}
            valueClassName="text-primary"
            icon={Target}
            leftLabel="Sessions"
            leftValue={String(sessions)}
            rightLabel="Units Sold"
            rightValue={String(units)}
          />
        </div>
      )}

      {loading ? (
        <div className="min-h-[390px] rounded-2xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-4 w-[280px]" />
            <Skeleton className="h-8 w-[132px] rounded-lg" />
          </div>
          <div className="flex h-[300px] items-end gap-[5%] px-4">
            {['62%', '54%', '70%', '82%', '74%', '58%', '30%'].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: h }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                <span className="size-3 rounded-[3px] bg-primary" /> Organic Traffic
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                <span className="size-3 rounded-[3px] bg-amber-500" /> Paid Traffic
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
                  <line x1="1" y1="6" x2="25" y2="6" stroke={LINE_COLOR} strokeWidth={2} />
                  <circle cx="13" cy="6" r="4" fill="var(--card)" stroke={LINE_COLOR} strokeWidth={2} />
                </svg>
                Unit Session %
              </span>
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground/70 transition hover:border-foreground/20"
            >
              <Filter className="size-3.5" />
              Filter products
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">{selectedCount}</span>
            </button>
          </div>

          <div className="relative mt-1 h-[320px]">
            <div className="absolute left-0 top-0 bottom-[22px] w-9">
              {leftTicks.map((t, i) => (
                <div
                  key={i}
                  className="absolute right-0 -translate-y-1/2 text-right text-[11px] font-semibold text-muted-foreground"
                  style={{ top: t.top }}
                >
                  {t.label}
                </div>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-[22px] w-9">
              {rightTicks.map((t, i) => (
                <div key={i} className="absolute left-0 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground" style={{ top: t.top }}>
                  {t.label}
                </div>
              ))}
            </div>
            <div className="absolute left-10 right-10 top-0 bottom-[22px]">
              {leftTicks.map((t, i) => (
                <div key={i} className="absolute inset-x-0 h-px bg-border/60" style={{ top: t.top }} />
              ))}
              {!hasData && (
                <div className="pointer-events-none absolute inset-0 right-0.5 flex items-center justify-end">
                  <span
                    className="text-[10.5px] font-extrabold tracking-[0.2em] text-border"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    NO DATA YET
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex">
                {days.map((d, i) => (
                  <div key={`${d.label}-${i}`} className="relative flex-1">
                    {d.show && (
                      <div
                        className="absolute bottom-0 left-[27%] w-[46%] bg-primary"
                        style={{ height: `${d.orgPct}%`, borderRadius: d.pd > 0 ? 0 : '4px 4px 0 0' }}
                      />
                    )}
                    {d.show && d.pd > 0 && (
                      <div
                        className="absolute left-[27%] w-[46%] rounded-t-md bg-amber-500"
                        style={{ bottom: `${d.orgPct}%`, height: `${d.paidPct}%` }}
                      />
                    )}
                    {hasData && (
                      <div
                        className="absolute left-1/2 z-[3] size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-card"
                        style={{ top: `${d.dotTop}%`, borderColor: LINE_COLOR }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="absolute left-10 right-10 bottom-0 flex h-[22px] items-center">
              {days.map((d, i) => (
                <span key={`${d.label}-${i}`} className="flex-1 text-center text-[11px] font-semibold text-muted-foreground">
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-7 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-[22px] w-28" />
            <Skeleton className="h-11 min-w-[220px] flex-1 rounded-[11px]" />
            <Skeleton className="h-11 w-[150px] rounded-[11px]" />
            <Skeleton className="h-11 w-[150px] rounded-[11px]" />
            <Skeleton className="h-11 w-[130px] rounded-[11px]" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-[11px] w-36" />
              <Skeleton className="mb-3 h-[15px] w-80" />
              <Skeleton className="h-[96px] w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-7">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4.5">
            <h2 className="mr-2 text-xl font-extrabold tracking-tight">Products</h2>
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                placeholder="Search by Title / ASIN / Category Name"
                className="w-full rounded-[11px] border border-border bg-muted/30 py-3 pl-10 pr-3.5 text-[13.5px] font-medium text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:bg-card"
              />
            </div>
            <button className="relative flex items-center gap-6 rounded-[11px] border border-border bg-muted/30 px-3.5 pb-2 pt-5 text-[13.5px] font-bold text-foreground/80 transition hover:border-foreground/20">
              <span className="absolute left-3.5 top-[7px] text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Sort by</span>
              Total Sales
              <span className="text-[11px] text-muted-foreground">▾</span>
            </button>
            <button className="relative flex items-center gap-10 rounded-[11px] border border-border bg-muted/30 px-3.5 pb-2 pt-5 text-[13.5px] font-bold text-foreground/80 transition hover:border-foreground/20">
              <span className="absolute left-3.5 top-[7px] text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Group by
              </span>
              Parent
              <span className="text-[11px] text-muted-foreground">▾</span>
            </button>
            <button className="flex items-center gap-2 rounded-[11px] border border-border bg-muted/30 px-4 py-3 text-[13.5px] font-bold text-foreground/80 transition hover:border-primary hover:text-primary">
              <Download className="size-4" />
              Export to CSV
            </button>
          </div>

          <div className="mt-[22px] flex flex-col gap-[26px]">
            {products.map((p) => (
              <div key={p.sku}>
                <div className="mb-2.5 px-0.5">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">Parent: {p.asin}</div>
                  <div className="flex items-center gap-2">
                    <span className="max-w-full truncate text-[15px] font-bold">{p.title}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/50" />
                  </div>
                </div>

                <div className="relative grid grid-cols-[84px_repeat(5,minmax(0,1fr))] items-center rounded-[14px] border border-border bg-card p-4 transition hover:border-foreground/15">
                  <div className="flex size-16 items-center justify-center rounded-[10px] border border-border bg-muted/40 text-sm font-extrabold text-muted-foreground/40">
                    {p.initials}
                  </div>
                  <Metric label="Sales" value={formatCurrency(p.revenue)} />
                  <Metric label="Units Sold" value={String(p.units)} />
                  <Metric label="Sessions" value={String(p.org + p.paid)} />
                  <Metric label="Unit Session %" value={p.usp} valueClassName="text-primary" />
                  <Metric
                    label="TACOS"
                    value={p.tacos}
                    valueClassName={parseFloat(p.tacos) >= 40 ? 'text-amber-600 dark:text-amber-500' : undefined}
                  />
                  <button className="absolute bottom-[-13px] left-1/2 flex size-[26px] -translate-x-1/2 items-center justify-center rounded-lg border border-border bg-card shadow-sm transition hover:border-foreground/20">
                    <ChevronDown className="size-[15px] text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-border p-10 text-center text-sm font-semibold text-muted-foreground/70">
                No products match your filters.
              </div>
            )}
          </div>
        </div>
      )}

      {filterOpen && (
        <div
          onClick={() => setFilterOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-6 backdrop-blur-[2px] sm:p-14"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100vh-112px)] w-full max-w-[920px] flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between px-7 pb-4.5 pt-6">
              <h2 className="text-2xl font-extrabold tracking-tight">Choose products</h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex size-[38px] shrink-0 items-center justify-center rounded-full border border-border transition hover:bg-muted"
              >
                <X className="size-4 text-foreground/70" />
              </button>
            </div>
            <div className="px-7 pb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground/60" />
                <input
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-[14.5px] font-medium text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-7 pb-7">
              <div className="overflow-hidden rounded-2xl border border-border">
                <div
                  onClick={toggleAll}
                  className="flex cursor-pointer items-center gap-4 border-b border-border/70 bg-muted/30 px-4.5 py-4"
                >
                  <Checkbox checked={allSelected} />
                  <span className="text-xs font-extrabold uppercase tracking-wide text-foreground/70">{selectedCount} products selected</span>
                </div>
                {visibleProducts.map((p) => (
                  <div
                    key={p.sku}
                    onClick={() => toggleProduct(p.index)}
                    className="flex cursor-pointer items-center gap-4 border-b border-border/50 px-4.5 py-3.5 transition last:border-b-0 hover:bg-muted/30"
                  >
                    <Checkbox checked={!!selected[p.index]} />
                    <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[10px] border border-border bg-muted/40 text-[13px] font-extrabold text-muted-foreground/40">
                      {p.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold">{p.title}</div>
                      <div className="mt-0.5 truncate text-xs font-semibold text-muted-foreground/70">
                        PARENT: {p.asin} / SKU: {p.sku}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-7 py-4">
              <button
                onClick={() => setFilterOpen(false)}
                className="rounded-[11px] border border-border px-5 py-3 text-sm font-bold text-foreground/80 transition hover:border-foreground/20"
              >
                Cancel
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="rounded-[11px] bg-primary px-5.5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                Apply ({selectedCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
