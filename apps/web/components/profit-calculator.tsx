'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Info, PlayCircle, Search, SquarePen } from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@amazon-profit/utils';
import { fetchProfitCalculator, type ProfitCalculatorRow } from '@/lib/api';

const columns = ['Sale Price', 'FBA Fee', 'Referral Fee', 'COGS', 'Storage Fee', 'Refund Rate', 'Marketing', 'Profit', 'Margin %'];

function initialsOf(title: string) {
  return title.slice(0, 2).toUpperCase();
}

function EditCell({ value, editable = true }: { value: React.ReactNode; editable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-1.5 border-b border-border/60 px-3 py-3.5">
      <span className="text-sm font-bold">{value}</span>
      {editable && (
        <button className="flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary hover:text-primary">
          <SquarePen className="size-[13px]" />
        </button>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pp-skeleton', className)} />;
}

export function ProfitCalculator() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProfitCalculatorRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProfitCalculator(30).then((rows) => {
      if (!cancelled) {
        setProducts(rows ?? []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2.5 rounded-[11px] border border-border bg-card px-4 py-2.5 text-[13.5px] font-bold text-foreground/80 transition hover:border-foreground/20">
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <h1 className="text-[30px] font-extrabold tracking-tight">Profit Calculator</h1>
        <span className="flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-border text-xs font-extrabold text-muted-foreground/70">
          <Info className="size-3" />
        </span>
        <a href="#" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-primary">
          <PlayCircle className="size-[15px]" />
          Video guide
        </a>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="relative min-w-[260px] max-w-[520px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            placeholder="Search by product name / sku / asin"
            className="w-full rounded-xl border border-border bg-card py-3.5 pl-10 pr-3.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground/80 transition hover:border-primary hover:text-primary">
          <Download className="size-4" />
          Export
        </button>
        <span className="max-w-[340px] text-[13.5px] font-medium leading-snug text-muted-foreground">
          Storage, refunds, and marketing are based on the last 30 days&rsquo; data.
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="mb-3.5 h-11 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-2.5 h-[60px] w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border p-10 text-center text-sm font-semibold text-muted-foreground/70">
          No product activity in this range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <div className="grid min-w-[1140px] grid-cols-[minmax(240px,1.5fr)_repeat(9,minmax(94px,1fr))]">
            <div className="col-span-2 border-b border-border bg-card" />
            <div className="col-span-6 flex items-center justify-center border-b border-border bg-muted/50 p-2.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Unit Economics
            </div>
            <div className="col-span-2 flex items-center justify-center border-b border-border bg-primary/[0.06] p-2.5 text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Profit Metrics
            </div>

            <div className="sticky left-0 z-[1] border-b border-border bg-card px-4.5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">
              Product
            </div>
            {columns.map((c, i) => (
              <div key={c} className={cn('border-b border-border px-3 py-3.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70', i > 0 && 'border-l border-border/60', i >= 7 && 'bg-primary/[0.03]')}>
                {c}
              </div>
            ))}

            {products.map((p) => (
              <Fragment key={p.id}>
                <div className="sticky left-0 z-[1] flex items-center gap-3 border-b border-border/60 bg-card px-4.5 py-3.5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[9px] border border-border bg-muted/40 text-xs font-extrabold text-muted-foreground/40">
                    {initialsOf(p.title)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{p.title}</div>
                    <div className="truncate text-[11.5px] font-semibold text-muted-foreground/70">
                      {p.sku} / ASIN: {p.asin}
                    </div>
                  </div>
                </div>
                <EditCell value={formatCurrency(p.avgPrice)} />
                <EditCell value={formatCurrency(p.fbaFee)} />
                <EditCell
                  value={
                    <>
                      {formatPercent(p.referralPct)} <span className="font-semibold text-muted-foreground/60">{formatCurrency(p.referralAmt)}</span>
                    </>
                  }
                />
                <EditCell value={formatCurrency(p.cogsPerUnit)} />
                <EditCell value={formatCurrency(p.storageFeePerUnit)} />
                <EditCell value={formatPercent(p.refundRate)} />
                <EditCell value={formatPercent(p.marketingPct)} />
                <div className="border-b border-border/60 bg-primary/[0.03] px-3 py-3.5">
                  <span className="text-[15px] font-extrabold tracking-tight text-primary">{formatCurrency(p.profit)}</span>
                </div>
                <div className="border-b border-border/60 bg-primary/[0.03] px-3 py-3.5">
                  <span className="text-sm font-extrabold text-primary">{formatPercent(p.marginPct)}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
