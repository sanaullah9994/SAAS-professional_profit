'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  CircleAlert,
  ClipboardList,
  CreditCard,
  Factory,
  LifeBuoy,
  Mail,
  Package,
  Phone,
  Plug,
} from 'lucide-react';
import { Button } from '@amazon-profit/ui';
import { Header } from '@/components/marketing/header';
import { Footer } from '@/components/marketing/footer';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_LABEL } from './support-contact';
import { SupportFaq } from './support-faq';

gsap.registerPlugin(ScrollTrigger);

const topics = [
  {
    icon: Plug,
    title: 'Amazon Seller Central connection',
    description:
      "Connect a seller account through Amazon's official authorization flow, review connection status, and re-authorize if access is revoked.",
    href: '#connection-help',
    linkLabel: 'Connection help',
  },
  {
    icon: Boxes,
    title: 'Inventory and order management',
    description:
      'Review FBA and inbound inventory, orders, and refunds, and check the status of your most recent syncs.',
    href: '#faq-inventory',
    linkLabel: 'Inventory FAQs',
  },
  {
    icon: Calculator,
    title: 'Profit and COGS tracking',
    description:
      'Set unit COGS per SKU and see true profit at the account, SKU, and order level after Amazon fees, refunds, and ad spend.',
    href: '#faq-profit',
    linkLabel: 'Profit FAQs',
  },
  {
    icon: BarChart3,
    title: 'Advertising and PPC analytics',
    description:
      'Track advertising spend and results alongside organic sales, and analyse search terms and keyword performance.',
    href: '#faq-ads',
    linkLabel: 'Advertising FAQs',
  },
  {
    icon: Factory,
    title: 'Bill of Materials and manufacturing costs',
    description:
      'Capture manufacturing, inbound freight, customs, and prep costs so your landed cost and profit figures reflect them.',
    href: '#faq-cogs',
    linkLabel: 'Cost FAQs',
  },
  {
    icon: CreditCard,
    title: 'Account and billing help',
    description:
      'Get help signing in, resetting your password, managing your account, or questions about your plan and billing.',
    href: '#contact',
    linkLabel: 'Contact support',
  },
];

const contactChecks = [
  'The email address you use to sign in',
  'Your Amazon marketplace (for example, US or EU)',
  'What you were trying to do when it failed',
  'The exact error message and a screenshot',
  'The date and time the problem happened',
];

export function SupportPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const sections = containerRef.current?.querySelectorAll<HTMLElement>('[data-animate]');
    if (sections) {
      sections.forEach((section, i) => {
        gsap.fromTo(
          section,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: i * 0.02,
            ease: 'power3.out',
            // The footer sits at the very bottom of the page, so an
            // '86%' start line can be unreachable at max scroll and would
            // leave it permanently invisible.
            scrollTrigger: {
              trigger: section,
              start: section.tagName === 'FOOTER' ? 'top bottom' : 'top 86%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      });
    }
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <section data-animate className="mx-auto max-w-7xl px-4 pt-14 pb-6 sm:px-6 lg:px-8 lg:pt-24">
        <div className="max-w-3xl">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Support Center</div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Real Profit Support
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground">
            Real Profit helps Amazon sellers track true profitability — inventory, orders, COGS, Amazon fees,
            advertising spend, and manufacturing costs — in one place. Find answers below, or contact our
            support team directly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#faq">
              <Button size="lg" className="h-[52px] rounded-xl px-7 text-base font-bold">
                Browse FAQs
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="#contact">
              <Button
                size="lg"
                variant="outline"
                className="h-[52px] rounded-xl px-7 text-base font-semibold"
              >
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section data-animate className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">Support Topics</div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">How can we help?</h2>
          <p className="mt-4 text-base font-medium text-muted-foreground">
            Pick a topic to jump to the right answer, or contact us if you would rather talk to a person.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => {
            const Icon = t.icon;
            return (
              <a
                key={t.title}
                href={t.href}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50 hover:shadow-sm"
              >
                <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-base font-bold tracking-tight">{t.title}</h3>
                <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                  {t.linkLabel}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section id="connection-help" data-animate className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <CircleAlert className="size-4" />
                Connection issues
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Amazon authorization or Seller Central connection failed?
              </h2>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-muted-foreground">
                Retry the connection from the Connections page first and make sure you complete the
                authorization inside Seller Central. If it still fails, you are returned to the app with an
                error, or your connection drops again after re-authorizing,{' '}
                <span className="font-bold text-foreground">contact support</span> — include a screenshot, your
                marketplace, and the time it happened so we can help you re-authorize quickly.
              </p>
            </div>
            <Link href="#contact" className="shrink-0">
              <Button size="lg" className="h-[52px] rounded-xl px-7 text-base font-bold">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SupportFaq />

      <section id="contact" data-animate className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 max-w-2xl">
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">Contact</div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Contact Support</h2>
          <p className="mt-4 text-base font-medium text-muted-foreground">
            Can&apos;t find your answer above? Our support team is ready to help — and if your Amazon
            authorization or Seller Central connection fails, please contact us so we can get you re-connected.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h3 className="text-lg font-bold tracking-tight">Reach us directly</h3>
            <div className="mt-5 space-y-3">
              {SUPPORT_EMAIL ? (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:border-primary/50"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Email
                    </span>
                    <span className="block truncate text-sm font-bold text-foreground">{SUPPORT_EMAIL}</span>
                  </span>
                </a>
              ) : null}
              {SUPPORT_PHONE ? (
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, '')}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:border-primary/50"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Phone
                    </span>
                    <span className="block truncate text-sm font-bold text-foreground">
                      {SUPPORT_PHONE_LABEL || SUPPORT_PHONE}
                    </span>
                  </span>
                </a>
              ) : null}
              {!SUPPORT_EMAIL && !SUPPORT_PHONE ? (
                <p className="rounded-xl border border-border bg-background p-4 text-sm font-medium text-muted-foreground">
                  Support contact details will be listed here.
                </p>
              ) : null}
            </div>
            <p className="mt-5 text-sm font-medium leading-relaxed text-muted-foreground">
              For connection or authorization failures, email is fastest — it lets you attach screenshots of
              the error straight away.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h3 className="text-lg font-bold tracking-tight">What to include when you contact us</h3>
            <ul className="mt-5 space-y-3">
              {contactChecks.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <LifeBuoy className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                Include the email address you sign in with so we can find your workspace, and let us know
                whether the problem affects one marketplace or all of them.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Package, label: 'Orders, inventory & refunds support' },
            { icon: ClipboardList, label: 'COGS & profit reporting support' },
            { icon: Plug, label: 'Seller Central connection support' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4"
            >
              <Icon className="size-5 shrink-0 text-primary" />
              <span className="text-sm font-bold tracking-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
