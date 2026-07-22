import Link from 'next/link';
import { Button } from '@amazon-profit/ui';

export function CTASection({
  heading,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  note,
}: {
  heading: React.ReactNode;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  note: string;
}) {
  return (
    <section id="cta" data-animate className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-[#14161a] px-6 py-16 text-center sm:px-16 sm:py-24">
        <div className="pointer-events-none absolute -inset-[40%] bg-[radial-gradient(circle_at_30%_40%,rgba(22,163,74,0.14),transparent_55%)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{heading}</h2>
          <p className="mx-auto mt-5 max-w-md text-lg font-medium text-white/60">{description}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={primaryHref}>
              <Button size="lg" className="h-[52px] rounded-xl bg-white px-8 text-base font-bold text-[#14161a] hover:bg-white/90 hover:opacity-100">
                {primaryLabel}
              </Button>
            </Link>
            <Link href={secondaryHref}>
              <Button
                size="lg"
                variant="outline"
                className="h-[52px] rounded-xl border-white/20 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10"
              >
                {secondaryLabel}
              </Button>
            </Link>
          </div>
          <div className="mt-5 text-sm font-medium text-white/40">{note}</div>
        </div>
      </div>
    </section>
  );
}
