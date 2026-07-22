import { Building2, CheckCircle2 } from 'lucide-react';

const brands = ['Brand Alpha', 'Brand Beta', 'Brand Gamma', 'Brand Delta'];

const points = [
  'Unlimited client accounts under one login',
  'Portfolio roll-ups and per-client drill-downs',
  'Role-based access for your whole team',
];

export function MultiAccountSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div data-animate>
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">Multi-account management</div>
          <h2 className="mb-4.5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Every client account, connected in one hierarchy.
          </h2>
          <p className="mb-6 text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
            Onboard a new brand in minutes and roll up performance across your entire book of business — or drill
            into a single client instantly.
          </p>
          <div className="flex flex-col gap-3.5">
            {points.map((p) => (
              <div key={p} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="text-[15px] font-medium leading-relaxed text-foreground/80">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div data-animate className="rounded-2xl border border-border bg-muted/30 p-7">
          <div className="grid grid-cols-[auto_1fr] items-center gap-5">
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
                <Building2 className="size-6 text-primary" strokeWidth={1.7} />
              </div>
              <span className="text-xs font-bold text-foreground/80">Your Agency</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {brands.map((b) => (
                <div key={b} className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2.5">
                  <span className="text-sm font-semibold">{b}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">Connected</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
