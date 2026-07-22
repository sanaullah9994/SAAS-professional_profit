import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer data-animate className="border-t border-border/60 py-9">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <Logo size={20} textClassName="text-sm font-extrabold" />
        </Link>
        <span className="text-xs font-medium text-muted-foreground">
          &copy; {new Date().getFullYear()} ProfitPilot. All rights reserved.
        </span>
        <div className="flex gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#" className="transition hover:text-foreground">
            Privacy
          </Link>
          <Link href="#" className="transition hover:text-foreground">
            Terms
          </Link>
          <Link href="#security" className="transition hover:text-foreground">
            Security
          </Link>
        </div>
      </div>
    </footer>
  );
}
