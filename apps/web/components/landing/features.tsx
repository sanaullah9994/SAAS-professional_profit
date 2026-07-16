import {
  BarChart3,
  Boxes,
  Calculator,
  LayoutGrid,
  RefreshCw,
  Bell,
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'PPC Analytics',
    description:
      'Campaign-level spend, impressions, clicks, and attributed sales across Sponsored Products, Brands, and Display.',
  },
  {
    icon: Calculator,
    title: 'SKU Profitability',
    description:
      'True per-unit profit after referral fees, fulfillment, storage, advertising, and COGS — no black boxes.',
  },
  {
    icon: Boxes,
    title: 'COGS Manager',
    description:
      'Effective-dated cost tracking with inbound freight, customs, and prep fees. See margin impact of cost changes over time.',
  },
  {
    icon: LayoutGrid,
    title: 'Multi-Brand Workspaces',
    description:
      'Separate brands or business units into workspaces with independent accounts, users, and reporting.',
  },
  {
    icon: RefreshCw,
    title: 'Automated Sync',
    description:
      'Pull orders, refunds, fees, and ad data from Amazon every hour via BullMQ queues. No manual exports.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description:
      'Get notified when margins drop, fees spike, or PPC efficiency degrades. Proactive, not reactive.',
  },
];

export function Features() {
  return (
    <section id="features" data-animate className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            Every metric that matters
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From PPC campaigns to landed COGS — see your Amazon business the way your
            accountant would.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
