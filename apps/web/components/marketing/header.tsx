'use client';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@amazon-profit/ui';
import { Logo } from './logo';

const navLinks = [
  ['/#features', 'Features'],
  ['/#security', 'Solutions'],
  ['/#social', 'Resources'],
  ['/pricing', 'Pricing'],
] as const;

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header data-animate className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-7">
          <Link href="/">
            <Logo />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map(([href, label]) => (
              <Link key={href} href={href} className="transition hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Log in
            </Button>
          </Link>
          <Link href="/login">
            <Button>Start Free</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
