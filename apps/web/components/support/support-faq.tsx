'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

const faqs = [
  {
    id: 'connect',
    q: 'How do I connect my Amazon Seller Central account?',
    a: "Start a connection from the Connections page in your dashboard. ProfitPilot uses Amazon's official authorization flow, so you sign in and approve access inside Seller Central — we never ask for or store your Amazon password.",
  },
  {
    id: 'authorization-failed',
    q: 'My Amazon authorization or Seller Central connection failed. What should I do?',
    a: "Retry the connection from the Connections page and make sure you finish the flow in Seller Central and approve the requested permissions. If it fails again — for example you are returned to the app with an error, or the connection never appears — contact support right away and include a screenshot, your marketplace, and the time it happened.",
  },
  {
    id: 'access',
    q: 'What access does ProfitPilot have to my Amazon account?',
    a: 'Access is read-only. We read orders, fees, refunds, inventory, and advertising data to calculate true profit. We never modify listings, pricing, or take any action inside your Amazon account.',
  },
  {
    id: 'disconnected',
    q: 'My connection shows as disconnected or stopped syncing. Why?',
    a: 'Authorizations can expire or be revoked — for example if the app is removed from your Seller Central account. Reconnect from the Connections page and check Sync History for the latest run. If it disconnects again after a successful re-authorization, contact support.',
  },
  {
    id: 'inventory',
    q: 'How current is my inventory and order data?',
    a: 'Data is pulled from Amazon on a schedule, and Sync History shows the status of every sync run. You can also trigger a refresh with Sync Now from the Connections page. If a run has failed, Sync History shows the error so you know when to contact support.',
  },
  {
    id: 'profit',
    q: 'How is true profit calculated?',
    a: 'Profit is reconciled at the order and SKU level: sales minus Amazon fees, refunds, COGS, advertising spend, and other recorded expenses. Results roll up to the dashboard, profit and loss, and SKU profitability views.',
  },
  {
    id: 'cogs',
    q: 'How do I enter COGS and manufacturing costs?',
    a: 'On Products & COGS you set a unit COGS for each SKU, including inbound freight, customs, and prep per unit, and you can record one-off or recurring costs under Manual Expenses. That is how manufacturing and landed costs are reflected in your profit figures.',
  },
  {
    id: 'ads',
    q: 'Where do I see advertising spend and PPC performance?',
    a: 'PPC Analytics shows advertising spend alongside sales and profitability, and Search Term Tags and Keyword Frequency help you analyse what shoppers actually search for. Ad spend is included when profit is calculated.',
  },
  {
    id: 'account',
    q: 'How do I reset my password or change account details?',
    a: 'Use the Forgot password link on the login page to reset your password, and open Settings in the dashboard to manage your profile and account security. For questions about your plan or billing, contact support.',
  },
];

export function SupportFaq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" data-animate className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mb-10">
        <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">FAQ</div>
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Frequently asked questions.</h2>
        <p className="mt-4 text-base font-medium text-muted-foreground">
          Answers to the most common connection, authorization, inventory, profit, and account questions.
        </p>
      </div>
      <div className="border-t border-border">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.id} id={`faq-${f.id}`} className="scroll-mt-24 border-b border-border">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-5 py-5 text-left font-sans"
              >
                <span className="text-base font-bold tracking-tight sm:text-lg">{f.q}</span>
                <Plus
                  className={cn('size-5 shrink-0 text-primary transition-transform duration-200', isOpen && 'rotate-45')}
                />
              </button>
              <div
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <p className="max-w-[660px] pb-6 text-[15px] font-medium leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
