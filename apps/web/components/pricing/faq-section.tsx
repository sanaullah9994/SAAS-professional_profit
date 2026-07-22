'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

const faqs = [
  {
    q: 'What Amazon permissions does ProfitPilot need?',
    a: "ProfitPilot uses Amazon's official OAuth flow to request least-privilege, read-only access to Selling Partner API data. You authorize the connection from within Seller Central — we never ask for or store your password.",
  },
  {
    q: 'Does ProfitPilot modify my seller account data?',
    a: 'No. Access is strictly read-only. We read orders, fees, refunds, and advertising data to calculate true profit, but we never write to, change, or take any action inside your Amazon account.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most agencies connect their first client and see a populated profit dashboard within 10–15 minutes. Historical data backfills automatically in the background, typically within a few hours.',
  },
  {
    q: 'Do you support multiple marketplaces and accounts?',
    a: 'Yes. ProfitPilot supports multi-marketplace sellers and unlimited client accounts on the Scale plan, with portfolio roll-ups across your entire book of business and per-client drill-downs.',
  },
  {
    q: 'How is true profit calculated — payouts or orders?',
    a: 'We reconcile at the order and SKU level, subtracting Amazon fees, refunds, COGS, and ad spend, then verify against actual payouts — so the net profit you see matches what actually landed in the bank.',
  },
  {
    q: 'How often does data refresh?',
    a: 'Financial and advertising data refresh daily by default. Growth and Scale plans include more frequent intraday syncs for time-sensitive advertising decisions.',
  },
  {
    q: 'Can I migrate data from another tool?',
    a: 'Yes. You can import historical COGS and expense data via CSV during onboarding, and our success team helps Scale customers migrate from spreadsheets or other analytics tools.',
  },
  {
    q: 'What does the free trial include?',
    a: "Every plan starts with a full-featured 14-day free trial — no credit card required. You get complete access to that plan's features so you can validate real profit numbers before you pay.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div data-animate className="mb-11">
        <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">FAQ</div>
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Every question, answered.</h2>
      </div>
      <div data-animate className="border-t border-border">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-b border-border">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-5 py-5 text-left font-sans"
              >
                <span className="text-base font-bold tracking-tight sm:text-lg">{f.q}</span>
                <Plus className={cn('size-5 shrink-0 text-primary transition-transform duration-200', isOpen && 'rotate-45')} />
              </button>
              <div
                className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                style={{ maxHeight: isOpen ? 260 : 0, opacity: isOpen ? 1 : 0 }}
              >
                <p className="max-w-[660px] pb-6 text-[15px] font-medium leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
