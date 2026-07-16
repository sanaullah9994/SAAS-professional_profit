import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Globe,
} from 'lucide-react';

const metrics = [
  {
    icon: DollarSign,
    value: '18',
    label: 'Profit Components',
    description: 'Revenue, fees, advertising, COGS, freight, customs, and more — tracked per transaction.',
  },
  {
    icon: TrendingUp,
    value: 'SKU-Level',
    label: 'Profit Precision',
    description: 'Every product evaluated individually. No averages, no guesswork.',
  },
  {
    icon: ShoppingCart,
    value: '24/7',
    label: 'Order Monitoring',
    description: 'Orders, refunds, and fees synced continuously from Amazon Seller Central.',
  },
  {
    icon: Globe,
    value: 'Multi-Marketplace',
    label: 'Global Coverage',
    description: 'US, EU, UK, JP — unified reporting across all your marketplaces.',
  },
];

export function Metrics() {
  return (
    <section id="metrics" data-animate className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            Built for depth, not vanity
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            RealProfit OS tracks the dimensions that actually move your bottom line.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <m.icon className="size-6" />
              </div>
              <div className="font-sans text-3xl font-bold tracking-tight">{m.value}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{m.label}</div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {m.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
