import { Button } from '@amazon-profit/ui';
import Link from 'next/link';

export function Hero() {
  return (
    <section data-animate className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(var(--primary)/0.08),transparent_60%)]" />
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          Amazon Profit Analytics for serious sellers
        </div>

        <h1 className="font-sans text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Know Your{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Real Amazon Profit
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Track PPC, COGS, fees, and margins — understand your true profitability,
          SKU by SKU, across every marketplace.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg" className="h-12 px-8 text-base">
              Start Free Trial
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              See How It Works
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border/40 pt-8 text-center">
          {[
            ['12+', 'Profit Dimensions'],
            ['Auto-Sync', 'Every Hour'],
            ['Multi-Brand', 'Workspaces'],
          ].map(([label, sub]) => (
            <div key={label}>
              <div className="text-sm font-semibold text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
