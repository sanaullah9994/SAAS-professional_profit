import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@amazon-profit/ui';
import { DashboardPreview } from './dashboard-preview';

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div data-animate className="min-w-0">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Built for Amazon Agencies
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-[0.98] tracking-tighter sm:text-6xl lg:text-7xl">
            Know the <span className="text-primary">true profit</span> behind every Amazon account.
          </h1>
          <p className="mb-9 max-w-[480px] text-lg font-medium leading-relaxed text-muted-foreground">
            Connect every client, track real profitability, and analyze performance from one clean workspace — built
            for agencies managing Amazon at scale.
          </p>
          <div className="mb-6 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg" className="h-[52px] rounded-xl px-7 text-base font-bold">
                Start Free
              </Button>
            </Link>
            <Link href="#cta">
              <Button size="lg" variant="outline" className="h-[52px] rounded-xl px-7 text-base font-semibold">
                Book a Demo
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" />
            14-day free trial · No credit card required · SOC 2-ready infrastructure
          </div>
        </div>

        <div data-animate className="min-w-0">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
