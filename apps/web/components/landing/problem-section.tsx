import { Users, MessageCircleQuestion, Megaphone } from 'lucide-react';

const problems = [
  {
    icon: Users,
    title: 'Multiple accounts. One problem.',
    description: 'Managing dozens of Seller Central logins wastes hours and creates costly blind spots.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Unknown true profit.',
    description: 'Revenue looks healthy, but fees, refunds, and ad spend hide what each client actually earns.',
  },
  {
    icon: Megaphone,
    title: 'Ads without context.',
    description: 'Advertising data sits siloed from profit, so no one knows which spend is truly working.',
  },
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div data-animate className="mb-12 max-w-xl">
        <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">The problem</div>
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Running Amazon for clients is harder than it should be.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {problems.map((p) => (
          <div
            key={p.title}
            data-animate
            className="rounded-2xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-foreground/15"
          >
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-muted">
              <p.icon className="size-5 text-foreground/70" strokeWidth={1.6} />
            </div>
            <h3 className="mb-2 text-lg font-bold tracking-tight">{p.title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
