'use client';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Activity, Moon, Sun } from 'lucide-react';
import { Button } from '@amazon-profit/ui';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header data-animate className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <span className="text-lg font-bold">RealProfit OS</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">
            Features
          </Link>
          <Link href="#metrics" className="text-sm text-muted-foreground transition hover:text-foreground">
            Metrics
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
