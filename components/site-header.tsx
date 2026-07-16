"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const links = [
  ["Product", "#product"],
  ["Analytics", "#analytics"],
  ["Solutions", "#solutions"],
  ["Pricing", "#pricing"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-7 lg:px-8">
        <a href="#top" aria-label="Professional Profit home">
          <Logo />
        </a>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost">Log in</Button>
          <Button>Start free trial</Button>
        </div>

        <button
          className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1">
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline">Log in</Button>
              <Button>Start trial</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
