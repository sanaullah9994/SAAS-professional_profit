'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, PlayCircle } from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { useChartReveal } from '@/lib/chart-animate';
import { fetchPerformance, type PerformanceDailyRow, type PerformanceMonthlyRow } from '@/lib/api';

type MetricKey = 'conv' | 'ctr' | 'acos' | 'cpc';
type Metric = { key: MetricKey; title: string; unit: '%' | '$'; dec: number; higherBetter: boolean };

const METRICS: Metric[] = [
  { key: 'conv', title: 'Conversion Rate', unit: '%', dec: 2, higherBetter: true },
  { key: 'ctr', title: 'CTR', unit: '%', dec: 2, higherBetter: true },
  { key: 'acos', title: 'ACOS', unit: '%', dec: 1, higherBetter: false },
  { key: 'cpc', title: 'Cost per Click', unit: '$', dec: 2, higherBetter: false },
];

function fmt(v: number, m: Metric) {
  return m.unit === '$' ? '$' + v.toFixed(m.dec) : v.toFixed(m.dec) + '%';
}
const shortDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const monthLabel = (ym: string) => new Date(ym + '-02').toLocaleDateString('en-US', { month: 'short' });

function buildChart(m: Metric, rows: PerformanceDailyRow[]) {
  const data = rows.length ? rows.map((r) => r[m.key]) : [0];
  const n = data.length;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pad = Math.max((hi - lo) * 0.25, hi * 0.08, 0.5);
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const topOf = (v: number) => (yMax === yMin ? 50 : (1 - (v - yMin) / (yMax - yMin)) * 100);
  const xOf = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);

  const ticks = Array.from({ length: 6 }, (_, k) => {
    const v = yMax - (k / 5) * (yMax - yMin);
    return { top: `${(k / 5) * 100}%`, label: fmt(v, m) };
  });
  const line = data.map((v, i) => `${xOf(i).toFixed(2)},${topOf(v).toFixed(2)}`).join(' ');
  const area = `0,100 ${line} 100,100`;

  const labelEvery = n <= 10 ? 1 : Math.ceil(n / 8);
  const points = data.map((v, i) => {
    const showLabel = i % labelEvery === 0 || i === n - 1;
    return { x: xOf(i), y: topOf(v), showLabel, label: fmt(v, m) };
  });

  const first = data[0] ?? 0;
  const last = data[data.length - 1] ?? 0;
  const deltaPct = first !== 0 ? ((last - first) / first) * 100 : 0;
  const good = m.higherBetter ? deltaPct >= 0 : deltaPct <= 0;
  const delta = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`;

  const dates = rows.map((r) => r.date);
  const labelIdx = dates.length > 1 ? [0, 1, 2, 3, 4, 5].map((k) => Math.round((k / 5) * (dates.length - 1))) : [0];
  const xLabels = labelIdx.map((i) => (dates[i] ? shortDate(dates[i]!) : ''));

  return { title: m.title, current: fmt(last, m), delta, good, ticks, line, area, points, xLabels };
}

function buildBar(title: string, monthly: PerformanceMonthlyRow[], key: 'sales' | 'profit') {
  const ppc = monthly.map((r) => Math.max(0, key === 'sales' ? r.salesPpc : r.profitPpc));
  const org = monthly.map((r) => Math.max(0, key === 'sales' ? r.salesOrg : r.profitOrg));
  const totals = ppc.map((v, i) => v + (org[i] ?? 0));
  const axisMax = Math.max(1, ...totals) * 1.16;
  const money = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
  const tick = (v: number) => (axisMax >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? '$' + Math.round(v / 1000) + 'K' : '$' + Math.round(v));
  const ticks = Array.from({ length: 5 }, (_, k) => {
    const v = axisMax - (k / 4) * axisMax;
    return { top: `${(k / 4) * 100}%`, label: tick(v) };
  });
  const months = monthly.map((r, i) => {
    const t = totals[i] ?? 0;
    const o = org[i] ?? 0;
    const pc = ppc[i] ?? 0;
    const op = t ? (o / t) * 100 : 0;
    const pp = t ? (pc / t) * 100 : 0;
    const tp = (t / axisMax) * 100;
    return { label: monthLabel(r.month), total: money(t), tp, op, pp, orgLabel: money(o), ppcLabel: money(pc), showOrg: op >= 12, showPpc: pp >= 12 };
  });
  return { title, ticks, months };
}

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('pp-skeleton', className)} style={style} />;
}

function LineChart({ c, height }: { c: ReturnType<typeof buildChart>; height: number }) {
  return (
    <div className="relative mt-1.5" style={{ height }}>
      <div className="absolute left-0 top-2 bottom-[22px] w-10">
        {c.ticks.map((t, i) => (
          <div key={i} className="absolute right-1.5 -translate-y-1/2 text-right text-[10.5px] font-semibold text-muted-foreground" style={{ top: t.top }}>
            {t.label}
          </div>
        ))}
      </div>
      <div className="absolute left-[42px] right-2 top-2 bottom-[22px]">
        {c.ticks.map((t, i) => (
          <div key={i} className="absolute inset-x-0 h-px bg-border/60" style={{ top: t.top }} />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <polygon points={c.area} fill="var(--primary)" fillOpacity={0.08} stroke="none" />
          <polyline points={c.line} fill="none" stroke="var(--primary)" strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {c.points.map((p, i) => (
          <div key={i}>
            <div
              className="absolute z-[2] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
            {p.showLabel && (
              <div
                className="absolute z-[3] -translate-x-1/2 whitespace-nowrap rounded bg-card px-1.5 py-0.5 text-[10px] font-extrabold text-foreground shadow"
                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-150%)' }}
              >
                {p.label}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="absolute left-[42px] right-2 bottom-0 flex h-[22px] items-center">
        {c.xLabels.map((x, i) => (
          <span key={i} className="flex-1 text-center text-[10.5px] font-semibold text-muted-foreground">
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

const RANGE_DEFS = [
  { label: 'Last 7 days', n: 7 },
  { label: 'Last 30 days', n: 30 },
  { label: 'Last 60 days', n: 60 },
  { label: 'Last 90 days', n: 90 },
];

export function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<PerformanceDailyRow[]>([]);
  const [monthly, setMonthly] = useState<PerformanceMonthlyRow[]>([]);
  const [tab, setTab] = useState(1);
  const [range, setRange] = useState(1);
  const [trendMetric, setTrendMetric] = useState(0);
  const [code, setCode] = useState('All');
  const [codeOpen, setCodeOpen] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);

  const n = (RANGE_DEFS[range] ?? { n: 30 }).n;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPerformance(n, code).then((res) => {
      if (cancelled) return;
      setDaily(res?.daily ?? []);
      setMonthly(res?.monthly ?? []);
      setCodes(res?.codes ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [n, code]);

  const kpiCharts = METRICS.map((m) => buildChart(m, daily));
  const tm = METRICS[trendMetric] ?? METRICS[0]!;
  const trend = buildChart(tm, daily);

  const overviewCharts = [buildBar('Monthly Total Sales', monthly, 'sales'), buildBar('Monthly Total Profit', monthly, 'profit')];
  const overviewRef = useChartReveal<HTMLDivElement>([loading, tab, code]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">Performance</h1>
          <a href="#" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-primary">
            <PlayCircle className="size-[15px]" />
            Video guide
          </a>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-[11px] border border-border bg-card p-[3px]">
          {RANGE_DEFS.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRange(i)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-all',
                range === i ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-0.5 rounded-[11px] border border-border bg-card p-[3px]">
        {['Overview', 'KPI', 'Trend'].map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={cn(
              'whitespace-nowrap rounded-lg px-5 py-2 text-[13px] font-medium transition-all',
              tab === i ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <button
            onClick={() => setCodeOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 pb-2.5 pt-[22px] text-sm font-bold text-foreground transition hover:border-foreground/20"
          >
            <span className="absolute left-3.5 top-2 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground/70">Product Code</span>
            {code}
            <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', codeOpen && 'rotate-180')} />
          </button>
          {codeOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-2xl">
              {['All', ...codes].map((c) => (
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
        {['Parent ASIN', 'Child ASIN', 'Managed'].map((label) => (
          <div key={label} className="relative">
            <button className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3.5 pb-2.5 pt-[22px] text-sm font-bold text-foreground transition hover:border-foreground/20">
              <span className="absolute left-3.5 top-2 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground/70">{label}</span>
              All
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5.5">
              <Skeleton className="mb-5.5 h-4 w-44" />
              <div className="flex h-[180px] items-end gap-[6%]">
                {['62%', '48%', '70%', '82%', '58%', '74%', '52%'].map((h, i2) => (
                  <Skeleton key={i2} className="flex-1" style={{ height: h }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {tab === 0 && (
            <div ref={overviewRef} className="flex flex-col gap-4">
              {overviewCharts.map((c) => (
                <div key={c.title} className="rounded-2xl border border-border bg-card p-5.5 pb-4">
                  <div className="mb-4.5 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-lg font-extrabold tracking-tight">{c.title}</h2>
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground/80">
                        <span className="size-3 rounded-[3px] bg-amber-500" /> PPC
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground/80">
                        <span className="size-3 rounded-[3px] bg-primary" /> Organic
                      </span>
                    </div>
                  </div>
                  {c.months.length > 0 ? (
                    <div className="relative h-[330px]">
                      <div className="absolute left-0 top-[26px] bottom-7 w-11">
                        {c.ticks.map((t, i) => (
                          <div key={i} className="absolute right-1.5 -translate-y-1/2 text-right text-[11px] font-semibold text-muted-foreground" style={{ top: t.top }}>
                            {t.label}
                          </div>
                        ))}
                      </div>
                      <div className="absolute left-12 right-2 top-[26px] bottom-7">
                        {c.ticks.map((t, i) => (
                          <div key={i} className="absolute inset-x-0 h-px bg-border/60" style={{ top: t.top }} />
                        ))}
                        <div className="absolute inset-0 flex items-end gap-[1%]">
                          {c.months.map((m, i) => (
                            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                              <div className="mb-1.5 whitespace-nowrap rounded-md bg-primary/10 px-2 py-0.5 text-[11.5px] font-extrabold text-primary">{m.total}</div>
                              <div data-chart-bar className="flex w-3/5 max-w-[66px] flex-col overflow-hidden rounded-t-md" style={{ height: `${m.tp}%` }}>
                                <div className="flex min-h-0 items-center justify-center bg-primary" style={{ height: `${m.op}%` }}>
                                  {m.showOrg && <span className="whitespace-nowrap text-[11px] font-extrabold text-primary-foreground">{m.orgLabel}</span>}
                                </div>
                                <div className="flex min-h-0 items-center justify-center bg-amber-500" style={{ height: `${m.pp}%` }}>
                                  {m.showPpc && <span className="whitespace-nowrap text-[11px] font-extrabold text-white">{m.ppcLabel}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="absolute left-12 right-2 bottom-0 flex h-7 items-center">
                        {c.months.map((m, i) => (
                          <span key={i} className="flex-1 text-center text-[11.5px] font-semibold text-muted-foreground">
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[330px] items-center justify-center text-sm font-semibold text-muted-foreground">No data for this period yet.</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {kpiCharts.map((c) => (
                <div key={c.title} className="rounded-2xl border border-border bg-card p-5 pb-4">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <h2 className="text-base font-extrabold tracking-tight">{c.title}</h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[19px] font-extrabold tracking-tight">{c.current}</span>
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-extrabold', c.good ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-600 dark:text-red-500')}>
                        {c.delta}
                      </span>
                    </div>
                  </div>
                  <LineChart c={c} height={210} />
                </div>
              ))}
            </div>
          )}

          {tab === 2 && (
            <div className="rounded-2xl border border-border bg-card p-5.5 pb-4.5">
              <div className="mb-4.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-lg font-extrabold tracking-tight">{trend.title}</h2>
                  <span className="text-[22px] font-extrabold tracking-tight text-primary">{trend.current}</span>
                  <span className={cn('rounded-md px-2 py-0.5 text-xs font-extrabold', trend.good ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-600 dark:text-red-500')}>
                    {trend.delta}
                  </span>
                </div>
                <div className="inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-muted/30 p-[3px]">
                  {METRICS.map((m, i) => (
                    <button
                      key={m.key}
                      onClick={() => setTrendMetric(i)}
                      className={cn(
                        'whitespace-nowrap rounded-[7px] px-3 py-1.5 text-xs font-medium transition-all',
                        trendMetric === i ? 'bg-card font-bold text-foreground shadow-sm' : 'text-muted-foreground',
                      )}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
              <LineChart c={trend} height={340} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
