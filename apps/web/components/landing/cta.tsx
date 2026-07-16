import { Button } from '@amazon-profit/ui';
import Link from 'next/link';

export function CTA() {
  return (
    <section data-animate className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background px-6 py-16 text-center shadow-sm sm:px-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,oklch(var(--primary)/0.06),transparent_70%)]" />

          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to know your real profit?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Stop guessing. Start optimizing. Connect your Amazon account and see your true
            margins in minutes.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
