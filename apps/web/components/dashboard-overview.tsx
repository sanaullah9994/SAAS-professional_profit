'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpRight, ExternalLink, MoreHorizontal, PlayCircle, Receipt, Search, TrendingUp } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

const ranges = ['Today', 'Yesterday', 'This month', 'Last month', 'Custom range'];

const bars = [
  { label: '9a', value: 0, height: 0 },
  { label: '11a', value: 120, height: 15 },
  { label: '1p', value: 730, height: 91 },
  { label: '3p', value: 90, height: 11 },
  { label: '5p', value: 60, height: 7.5 },
  { label: '7p', value: 40, height: 5 },
  { label: '9p', value: 14, height: 1.8 },
];

const expenses = [
  { name: 'Cost of Goods', pct: '15%', amount: '$161', tag: '!', warn: true },
  { name: 'Referral Fee', pct: '15%', amount: '$158', tag: '', warn: false },
  { name: 'Adjustments', pct: '14%', amount: '$149', tag: '(1)', warn: false },
  { name: 'Advertising', pct: '5%', amount: '$54', tag: '(3)', warn: false },
  { name: 'Fulfillment Fees', pct: '3%', amount: '$28', tag: '(1)', warn: false },
  { name: 'Discounts', pct: '0%', amount: '$0', tag: '', warn: false },
  { name: 'Manual Exp.', pct: '0%', amount: '$0', tag: '', warn: false },
];

const products = [
  {
    parent: 'B097FF9WPG',
    title: 'Clear Polycarbonate Sheet 48" x 96" (5/64" Thick)',
    initials: 'CL',
    sales: '$826',
    organic: '$182 · 22%',
    advertising: '$644 · 78%',
    units: '6',
    avgPrice: '$137.66',
    discounts: '0 · 0%',
    expenses: '$290',
    refundsRate: '$0 · 0.00%',
    marketing: '$34 · 4.14%',
    profit: '$536',
    margin: '64.93%',
    roi: '425.60%',
  },
  {
    parent: 'B0GSGKW1YF',
    title: 'Black ABS Plastic Sheet. DIY and Hobby Plastic. One Textured Side One Smooth Matte Side.',
    initials: 'BL',
    sales: '$86',
    organic: '$0 · 0%',
    advertising: '$86 · 100%',
    units: '1',
    avgPrice: '$85.99',
    discounts: '0 · 0%',
    expenses: '$29',
    refundsRate: '$0 · 0.00%',
    marketing: '$3 · 3.30%',
    profit: '$57',
    margin: '66.16%',
    roi: '425.83%',
  },
  {
    parent: 'B0C54GGRWB',
    title: 'Black HDPE Sheet 12" x 24" (3/4" Thick)',
    initials: 'BL',
    sales: '$73',
    organic: '$73 · 100%',
    advertising: '$0 · 0%',
    units: '2',
    avgPrice: '$36.49',
    discounts: '0 · 0%',
    expenses: '$60',
    refundsRate: '$0 · 0.00%',
    marketing: '$0 · 0.00%',
    profit: '$13',
    margin: '17.56%',
    roi: '312.40%',
  },
];

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('pp-skeleton', className)} style={style} />;
}

export function DashboardOverview() {
  const [range, setRange] = useState(0);
  const [loading, setLoading] = useState(true);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);

  function selectRange(i: number) {
    setRange(i);
    setLoading(true);
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => setLoading(false), 750);
  }

  useEffect(() => () => clearTimeout(reloadTimer.current), []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">Dashboard</h1>
          <a href="#" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-primary">
            <PlayCircle className="size-[15px]" />
            Video guide
          </a>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-[11px] border border-border bg-card p-[3px]">
          {ranges.map((label, i) => (
            <button
              key={label}
              onClick={() => selectRange(i)}
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
            label="Sales"
            value="$1,054"
            icon={<TrendingUp className="size-[18px] text-foreground/70" strokeWidth={1.7} />}
            leftLabel="Organic"
            leftValue="$324 · 31%"
            rightLabel="Advertising"
            rightValue="$730 · 69%"
          />
          <SummaryCard
            label="Units"
            value="10"
            icon={<Receipt className="size-[18px] text-foreground/70" strokeWidth={1.7} />}
            leftLabel="Full Price"
            leftValue="10 · 100%"
            rightLabel="Discounts"
            rightValue="0 · 0%"
          />
          <SummaryCard
            label="Profit"
            value="$504"
            valueClassName="text-primary"
            icon={<ArrowUpRight className="size-[18px] text-primary" strokeWidth={1.9} />}
            leftLabel="Margin"
            leftValue="47.81%"
            leftClassName="text-primary"
            rightLabel="ROI"
            rightValue="312.80%"
            rightClassName="text-primary"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex min-h-[362px] flex-col rounded-2xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
            <div className="flex flex-1 items-end gap-[5%] px-4 pb-5">
              {['22%', '48%', '86%', '40%', '58%', '34%', '46%'].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: h }} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4.5 flex justify-between">
              <div>
                <Skeleton className="mb-2.5 h-[11px] w-18" />
                <Skeleton className="h-6 w-22" />
              </div>
              <Skeleton className="size-9 rounded-[10px]" />
            </div>
            <div className="mb-1.5 h-px bg-border" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 border-b border-border/60 py-2.5">
                <Skeleton className="h-3.5 w-9" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3.5 w-10" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="size-[11px] rounded-[3px] bg-primary" />
                <span className="text-[13.5px] font-bold">Sales</span>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground/70 transition hover:border-foreground/20">
                Filter products
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">1282</span>
              </button>
            </div>

            <div className="grid min-h-[300px] flex-1 grid-cols-[44px_1fr] gap-2">
              <div className="flex flex-col justify-between py-1 pb-5 text-right text-[11px] font-semibold text-muted-foreground">
                {['$800', '$700', '$600', '$500', '$400', '$300', '$200', '$100', '$0'].map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
              <div className="relative pb-5">
                <div className="absolute inset-x-0 bottom-5 top-0 flex flex-col justify-between">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={cn('h-px', i === 8 ? 'bg-border' : 'bg-border/60')} />
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-5 top-0 flex items-end justify-around px-[4%]">
                  {bars.map((b) => (
                    <div key={b.label} className="flex h-full w-full flex-col items-center justify-end">
                      <div
                        className="w-[min(46px,60%)] rounded-t-md"
                        style={{ height: `${b.height}%`, background: b.value >= 400 ? 'var(--primary)' : 'var(--border)' }}
                        title={`$${b.value}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-around px-[4%] text-[11px] font-semibold text-muted-foreground">
                  {bars.map((b) => (
                    <span key={b.label} className="flex-1 text-center">
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Expenses</div>
                <div className="text-[28px] font-extrabold tracking-tight">$550</div>
              </div>
              <div className="flex size-9 items-center justify-center rounded-[10px] border border-border">
                <Receipt className="size-[17px] text-foreground/70" strokeWidth={1.6} />
              </div>
            </div>
            <div className="mb-1.5 h-px bg-border" />
            <div className="flex flex-col">
              {expenses.map((e) => (
                <div key={e.name} className="flex items-center gap-3.5 border-b border-border/60 py-2.5">
                  <span className={cn('w-11 shrink-0 text-center text-[12.5px] font-extrabold', e.pct === '0%' ? 'text-muted-foreground/60' : 'text-primary')}>
                    {e.pct}
                  </span>
                  <span className="flex flex-1 items-center gap-1.5 text-sm font-semibold">
                    {e.name}
                    {e.tag &&
                      (e.warn ? (
                        <span className="flex size-4 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                          {e.tag}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground/70">{e.tag}</span>
                      ))}
                  </span>
                  <span className="shrink-0 text-sm font-extrabold tracking-tight">{e.amount}</span>
                </div>
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
            <Skeleton className="h-11 w-[170px] rounded-[11px]" />
            <Skeleton className="h-11 w-[190px] rounded-[11px]" />
          </div>
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-[11px] w-36" />
              <Skeleton className="mb-3 h-[15px] w-80" />
              <Skeleton className="h-[118px] w-full rounded-2xl" />
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
                placeholder="Search by Title / ASIN / Category Name"
                className="w-full rounded-[11px] border border-border bg-muted/30 py-3 pl-10 pr-3.5 text-[13.5px] font-medium text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:bg-card"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="relative flex items-center gap-6 rounded-[11px] border border-border bg-muted/30 px-3.5 pb-2 pt-5 text-[13.5px] font-bold text-foreground/80 transition hover:border-foreground/20">
                <span className="absolute left-3.5 top-[7px] text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Sort by</span>
                Sales
                <span className="text-[11px] text-muted-foreground">▾</span>
              </button>
              <button className="flex size-[46px] items-center justify-center rounded-[11px] border border-border bg-muted/30 text-muted-foreground transition hover:border-foreground/20">
                <ArrowDownWideNarrow className="size-[17px]" strokeWidth={1.7} />
              </button>
              <button className="relative flex items-center gap-10 rounded-[11px] border border-border bg-muted/30 px-3.5 pb-2 pt-5 text-[13.5px] font-bold text-foreground/80 transition hover:border-foreground/20">
                <span className="absolute left-3.5 top-[7px] text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Group by</span>
                Parent
                <span className="text-[11px] text-muted-foreground">▾</span>
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            {products.map((p) => (
              <div key={p.parent}>
                <div className="mb-2.5 px-0.5">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">Parent: {p.parent}</div>
                  <div className="flex items-center gap-2">
                    <span className="max-w-full truncate text-[15px] font-bold">{p.title}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/50" />
                  </div>
                </div>

                <div className="grid grid-cols-[84px_repeat(5,minmax(0,1fr))] items-stretch overflow-hidden rounded-[14px] border border-border bg-card p-4 transition hover:border-foreground/15">
                  <div className="flex size-[70px] items-center justify-center self-center rounded-[10px] border border-border bg-muted/40 text-[15px] font-extrabold text-muted-foreground/40">
                    {p.initials}
                  </div>

                  <div className="flex justify-between gap-3 border-l border-border/70 px-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Sales</div>
                      <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight">{p.sales}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Organic</div>
                        <div className="text-[12.5px] font-bold text-primary">{p.organic}</div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Advertising</div>
                        <div className="text-[12.5px] font-bold text-foreground/70">{p.advertising}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 border-l border-border/70 px-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Units</div>
                      <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight">{p.units}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Avg Price</div>
                        <div className="text-[12.5px] font-bold text-foreground/80">{p.avgPrice}</div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Discounts</div>
                        <div className="text-[12.5px] font-bold text-foreground/70">{p.discounts}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col border-l border-border/70 px-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Expenses</div>
                    <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight">{p.expenses}</div>
                    <button className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-muted-foreground transition hover:border-foreground/20">
                      <MoreHorizontal className="size-3.5" />
                      <span className="text-[10px]">▾</span>
                    </button>
                  </div>

                  <div className="flex flex-col justify-center gap-3.5 border-l border-border/70 px-4">
                    <div>
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Refunds · Rate</div>
                      <div className="text-[13px] font-bold text-foreground/80">{p.refundsRate}</div>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Marketing · %</div>
                      <div className="text-[13px] font-bold text-foreground/70">{p.marketing}</div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 border-l-2 border-primary py-0.5 pl-4.5 pr-1">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Profit</div>
                      <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight text-primary">{p.profit}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Margin</div>
                        <div className="text-[12.5px] font-bold text-primary">{p.margin}</div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">ROI</div>
                        <div className="text-[12.5px] font-bold text-primary">{p.roi}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName,
  icon,
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
  icon: React.ReactNode;
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
        <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-border">{icon}</div>
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
