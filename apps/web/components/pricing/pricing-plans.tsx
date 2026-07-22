'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { Button } from '@amazon-profit/ui';
import { cn } from '@amazon-profit/utils';

const tiers = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'For solo consultants managing 1–2 client accounts.',
    monthly: 49,
    annual: 39,
    featured: false,
    includesNote: null as string | null,
    features: ['Up to 2 client accounts', 'Profit dashboard', 'Basic reporting', 'One-click Amazon sync', 'Email support'],
  },
  {
    key: 'growth',
    name: 'Growth',
    description: 'For growing agencies scaling a book of clients.',
    monthly: 149,
    annual: 119,
    featured: true,
    includesNote: 'Everything in Starter, plus',
    features: ['Up to 15 client accounts', 'Advanced profit analytics', 'Ad spend tracking & ROAS', 'SKU-level true profit', 'Priority support'],
  },
  {
    key: 'scale',
    name: 'Scale',
    description: 'For large multi-client operations and teams.',
    monthly: 399,
    annual: 319,
    featured: false,
    includesNote: 'Everything in Growth, plus',
    features: ['Unlimited client accounts', 'Custom report building', 'Role-based team access', 'Dedicated success manager', 'SSO & audit logs'],
  },
];

type Cell = true | false | string;
type Row = { label: string; s: Cell; g: Cell; sc: Cell } | { head: string };

const comparisonRows: Row[] = [
  { head: 'Financial Analytics' },
  { label: 'Profit Dashboard', s: true, g: true, sc: true },
  { label: 'Profit Calculator', s: true, g: true, sc: true },
  { label: 'P&L Statements', s: false, g: true, sc: true },
  { label: 'Plan vs Actual', s: false, g: true, sc: true },
  { head: 'Growth & Market Analytics' },
  { label: 'Market Share & Funnel', s: false, g: true, sc: true },
  { label: 'LTV & Subscriptions', s: false, g: true, sc: true },
  { label: 'Competitor Benchmarking', s: false, g: false, sc: true },
  { label: 'Advertising Analytics', s: false, g: true, sc: true },
  { head: 'Operations & Monitoring' },
  { label: 'Day-to-day Ops View', s: true, g: true, sc: true },
  { label: 'Inventory Tracking', s: true, g: true, sc: true },
  { label: 'Advanced Inventory', s: false, g: true, sc: true },
  { label: 'Refunds Analytics', s: false, g: true, sc: true },
  { head: 'Setup & Customization' },
  { label: 'Custom Categories', s: false, g: true, sc: true },
  { label: 'Manual Expenses', s: true, g: true, sc: true },
  { label: 'Reporting Customization', s: false, g: true, sc: true },
  { label: 'Custom Report Building', s: false, g: false, sc: true },
  { label: 'Included Customization Hours', s: '—', g: '2 hrs', sc: '10 hrs' },
];

function Mark({ value }: { value: Cell }) {
  if (value === true) return <Check className="size-4 text-primary" strokeWidth={3} />;
  if (value === false) return <Minus className="size-3 text-muted-foreground/50" />;
  return <span className="text-xs font-semibold text-foreground/70">{value}</span>;
}

export function PricingPlans() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <div data-animate className="mb-7 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Pricing
        </div>
        <h1 data-animate className="mb-5 max-w-3xl text-5xl font-extrabold leading-none tracking-tighter sm:text-6xl">
          Simple, predictable <span className="text-primary">pricing</span> for agencies.
        </h1>
        <p data-animate className="mb-9 max-w-lg text-lg font-medium leading-relaxed text-muted-foreground">
          Every plan starts with a 14-day free trial — no credit card required. Scale your seats and clients as your
          agency grows.
        </p>
        <div data-animate className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              'rounded-lg px-4.5 py-2 font-mono text-sm font-bold transition-all',
              !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              'flex items-center rounded-lg px-4.5 py-2 text-sm font-bold transition-all',
              annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            Annual
            <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-bold text-primary">Save 20%</span>
          </button>
        </div>
      </section>

      <section id="tiers" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              data-animate
              className={cn(
                'relative flex flex-col rounded-2xl border bg-card p-8 transition hover:-translate-y-1',
                tier.featured
                  ? 'border-[1.5px] border-primary shadow-[0_1px_2px_rgba(20,22,26,0.04),0_24px_50px_-30px_rgba(22,163,74,0.32)]'
                  : 'border-border hover:border-foreground/20',
              )}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11.5px] font-bold text-primary">
                  Best value
                </div>
              )}
              <h3 className="mb-1.5 text-lg font-extrabold tracking-tight">{tier.name}</h3>
              <p className="mb-5 min-h-[42px] text-sm font-medium leading-relaxed text-muted-foreground">{tier.description}</p>
              <div className="mb-1 flex items-end gap-1">
                <span className={cn('text-[44px] font-extrabold leading-none tracking-tighter', tier.featured && 'text-primary')}>
                  ${annual ? tier.annual : tier.monthly}
                </span>
                <span className="mb-1.5 text-sm font-semibold text-muted-foreground">/mo</span>
              </div>
              <div className="mb-6 text-xs font-medium text-muted-foreground/70">
                {annual ? 'per month, billed annually' : 'billed monthly'}
              </div>
              <Link href="/login" className="mb-2.5">
                <Button className={cn('h-[46px] w-full rounded-xl text-[14.5px] font-bold', !tier.featured && 'bg-foreground/90 hover:bg-foreground')}>
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#cta" className="mb-6 text-center text-sm font-semibold text-muted-foreground transition hover:text-primary">
                Book a Demo
              </Link>
              <div className="mb-6 h-px bg-border" />
              {tier.includesNote && <div className="mb-3.5 text-xs font-bold text-foreground/80">{tier.includesNote}</div>}
              <div className="flex flex-col gap-3">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="size-3 text-primary" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-foreground/80">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div data-animate className="mb-11 max-w-xl">
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">Full comparison</div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Compare all features.</h2>
        </div>
        <div data-animate className="overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-[34%] bg-card p-5 text-left align-bottom" />
                  {tiers.map((tier) => (
                    <th
                      key={tier.key}
                      className={cn('border-l border-border/70 p-5 text-left align-bottom', tier.featured && 'bg-primary/[0.03]')}
                    >
                      <div className={cn('text-[15px] font-extrabold tracking-tight', tier.featured && 'text-primary')}>{tier.name}</div>
                      <div className="my-1 text-[13px] font-semibold text-muted-foreground">
                        ${annual ? tier.annual : tier.monthly}/mo
                      </div>
                      <Link href="/login" className="text-[12.5px] font-bold text-primary hover:underline">
                        Start trial →
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) =>
                  'head' in row ? (
                    <tr key={i} className="border-t border-border/60">
                      <td
                        colSpan={4}
                        className="bg-card px-5 pb-2.5 pt-5 text-[11px] font-extrabold uppercase tracking-widest text-primary"
                      >
                        {row.head}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t border-border/60">
                      <td className="bg-card p-5 py-3.5 text-sm font-medium text-foreground/75">{row.label}</td>
                      <td className="border-l border-border/70 p-5 py-3.5">
                        <Mark value={row.s} />
                      </td>
                      <td className="border-l border-border/70 bg-primary/[0.03] p-5 py-3.5">
                        <Mark value={row.g} />
                      </td>
                      <td className="border-l border-border/70 p-5 py-3.5">
                        <Mark value={row.sc} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
