'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ExternalLink, PlayCircle, Receipt, TrendingUp } from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@amazon-profit/utils';
import { fetchDashboardOverview, type DashboardOverviewResponse } from '@/lib/api';

const ranges = ['Today', 'Yesterday', 'This month', 'Last month', 'Custom range'];
const rangeDays = [1, 2, 30, 60, 90];

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('pp-skeleton', className)} style={style} />;
}

function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DashboardOverview() {
  const [range, setRange] = useState(0);
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboardOverview(rangeDays[range] ?? 30).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const summary = data?.summary;
  const trend = data?.trend ?? [];
  const expenses = data?.expenses;
  const products = data?.products ?? [];
  const maxRevenue = Math.max(1, ...trend.map((t) => t.revenue));

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

      {loading || !summary ? (
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
            value={formatCurrency(summary.revenue)}
            icon={<TrendingUp className="size-[18px] text-foreground/70" strokeWidth={1.7} />}
            leftLabel="Ad Spend"
            leftValue={formatCurrency(summary.adSpend)}
            rightLabel="TACOS"
            rightValue={formatPercent(summary.tacosPercent)}
          />
          <SummaryCard
            label="Units"
            value={String(summary.units)}
            icon={<Receipt className="size-[18px] text-foreground/70" strokeWidth={1.7} />}
            leftLabel="Avg Order Value"
            leftValue={formatCurrency(summary.units ? summary.revenue / summary.units : 0)}
            rightLabel="Refund Rate"
            rightValue={formatPercent(summary.revenue ? (summary.refunds / summary.revenue) * 100 : 0)}
          />
          <SummaryCard
            label="Profit"
            value={formatCurrency(summary.profit)}
            valueClassName="text-primary"
            icon={<ArrowUpRight className="size-[18px] text-primary" strokeWidth={1.9} />}
            leftLabel="Margin"
            leftValue={formatPercent(summary.marginPercent)}
            leftClassName="text-primary"
            rightLabel="ROI"
            rightValue={formatPercent(summary.roiPercent)}
            rightClassName="text-primary"
          />
        </div>
      )}

      {loading || !summary ? (
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
            </div>

            <div className="grid min-h-[300px] flex-1 grid-cols-[56px_1fr] gap-2">
              <div className="flex flex-col justify-between py-1 pb-5 text-right text-[11px] font-semibold text-muted-foreground">
                {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                  <span key={f}>{formatCurrency(maxRevenue * f)}</span>
                ))}
              </div>
              <div className="relative pb-5">
                <div className="absolute inset-x-0 bottom-5 top-0 flex flex-col justify-between">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={cn('h-px', i === 4 ? 'bg-border' : 'bg-border/60')} />
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-5 top-0 flex items-end justify-around px-[4%]">
                  {trend.map((b) => (
                    <div key={b.date} className="flex h-full w-full flex-col items-center justify-end">
                      <div
                        className="w-[min(46px,60%)] rounded-t-md"
                        style={{ height: `${(b.revenue / maxRevenue) * 100}%`, background: 'var(--primary)' }}
                        title={formatCurrency(b.revenue)}
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-around px-[4%] text-[11px] font-semibold text-muted-foreground">
                  {trend.map((b) => (
                    <span key={b.date} className="flex-1 text-center">
                      {shortDate(b.date)}
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
                <div className="text-[28px] font-extrabold tracking-tight">{formatCurrency(expenses?.total ?? 0)}</div>
              </div>
              <div className="flex size-9 items-center justify-center rounded-[10px] border border-border">
                <Receipt className="size-[17px] text-foreground/70" strokeWidth={1.6} />
              </div>
            </div>
            <div className="mb-1.5 h-px bg-border" />
            <div className="flex flex-col">
              {(expenses?.items ?? []).map((e) => (
                <div key={e.name} className="flex items-center gap-3.5 border-b border-border/60 py-2.5">
                  <span className={cn('w-11 shrink-0 text-center text-[12.5px] font-extrabold', e.pct === 0 ? 'text-muted-foreground/60' : 'text-primary')}>
                    {formatPercent(e.pct)}
                  </span>
                  <span className="flex flex-1 items-center gap-1.5 text-sm font-semibold">{e.name}</span>
                  <span className="shrink-0 text-sm font-extrabold tracking-tight">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading || !data ? (
        <div className="mt-7 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-[22px] w-28" />
            <Skeleton className="h-11 min-w-[220px] flex-1 rounded-[11px]" />
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
          </div>

          <div className="mt-5 flex flex-col gap-5">
            {products.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-border p-10 text-center text-sm font-semibold text-muted-foreground/70">
                No product activity in this range.
              </div>
            )}
            {products.map((p) => (
              <div key={p.sku}>
                <div className="mb-2.5 px-0.5">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">Parent: {p.asin}</div>
                  <div className="flex items-center gap-2">
                    <span className="max-w-full truncate text-[15px] font-bold">{p.title}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/50" />
                  </div>
                </div>

                <div className="grid grid-cols-[84px_repeat(5,minmax(0,1fr))] items-center overflow-hidden rounded-[14px] border border-border bg-card p-4 transition hover:border-foreground/15">
                  <div className="flex size-[70px] items-center justify-center self-center rounded-[10px] border border-border bg-muted/40 text-[15px] font-extrabold text-muted-foreground/40">
                    {p.title.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="border-l border-border/70 px-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Sales</div>
                    <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight">{formatCurrency(p.revenue)}</div>
                  </div>

                  <div className="border-l border-border/70 px-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Units</div>
                    <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight">{p.units}</div>
                  </div>

                  <div className="border-l border-border/70 px-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Expenses</div>
                    <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight">{formatCurrency(p.amazonFees + p.cogs)}</div>
                  </div>

                  <div className="flex flex-col justify-center gap-3.5 border-l border-border/70 px-4">
                    <div>
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Refunds</div>
                      <div className="text-[13px] font-bold text-foreground/80">{formatCurrency(p.refunds)}</div>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Ad Spend</div>
                      <div className="text-[13px] font-bold text-foreground/70">{formatCurrency(p.adSpend)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 border-l-2 border-primary py-0.5 pl-4.5 pr-1">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Profit</div>
                      <div className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight text-primary">{formatCurrency(p.netProfit)}</div>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-2 text-right">
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Margin</div>
                        <div className="text-[12.5px] font-bold text-primary">{formatPercent(p.marginPercent)}</div>
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
