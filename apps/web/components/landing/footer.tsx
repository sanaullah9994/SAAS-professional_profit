import { Activity } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer data-animate className="border-t border-border/40 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </div>
            <span className="text-sm font-semibold">RealProfit OS</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="transition hover:text-foreground">
              Features
            </Link>
            <Link href="#metrics" className="transition hover:text-foreground">
              Metrics
            </Link>
            <Link href="/login" className="transition hover:text-foreground">
              Sign In
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} RealProfit OS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
