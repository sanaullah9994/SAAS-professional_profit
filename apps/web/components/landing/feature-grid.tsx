const clientRows = [
  ['Brand Alpha', '$182K'],
  ['Brand Beta', '$128K'],
  ['Brand Gamma', '$96K'],
];

const skuRows = [
  ['Revenue', '$78.45'],
  ['Amazon fees', '-$12.34'],
  ['Ad spend', '-$6.91'],
];

export function FeatureGrid() {
  return (
    <section id="features" className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div data-animate className="mb-12 max-w-xl">
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">One workspace</div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Manage every Amazon client from one place.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div data-animate className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-foreground/15">
            <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">
              <div className="mb-2 text-[11px] font-bold text-foreground/80">All Clients</div>
              {clientRows.map(([name, val]) => (
                <div key={name} className="flex justify-between border-t border-border/70 py-1">
                  <span className="font-semibold text-muted-foreground">{name}</span>
                  <span className="font-bold text-primary">{val}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-1.5 font-bold tracking-tight">All your clients. One dashboard.</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Manage every Amazon account from a single, unified workspace.
              </p>
            </div>
          </div>

          <div data-animate className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-foreground/15">
            <div className="rounded-lg border border-border p-3 text-[10px]">
              <div className="mb-2.5 flex justify-between text-[11px] font-bold text-foreground/80">
                <span>Sync in progress</span>
                <span className="text-primary">78%</span>
              </div>
              <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[78%] rounded-full bg-primary" />
              </div>
              {['Orders', 'Fees', 'Refunds'].map((label) => (
                <div key={label} className="flex justify-between py-0.5 text-muted-foreground">
                  <span>{label}</span>
                  <span className="text-primary">✓</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-1.5 font-bold tracking-tight">One-click sync.</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Connect and sync Amazon data in minutes. We handle the rest.
              </p>
            </div>
          </div>

          <div data-animate className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-foreground/15">
            <div className="rounded-lg border border-border p-3 text-[10px]">
              <div className="mb-2 flex justify-between">
                <span className="text-[11px] font-bold text-foreground/80">True Profit (SKU)</span>
                <span className="text-[15px] font-extrabold text-primary">$24.82</span>
              </div>
              {skuRows.map(([label, val]) => (
                <div key={label} className="flex justify-between border-t border-border/70 py-1 text-muted-foreground">
                  <span>{label}</span>
                  <span className="font-semibold text-foreground/80">{val}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-1.5 font-bold tracking-tight">Real profit. Real decisions.</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Automatically calculate true profit for every SKU and product.
              </p>
            </div>
          </div>

          <div data-animate className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-foreground/15">
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex justify-between">
                <span className="text-[11px] font-bold text-foreground/80">Ad Performance</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">ACoS ▾</span>
              </div>
              <svg width="100%" height="60" viewBox="0 0 240 60" preserveAspectRatio="none">
                <path d="M6 44 L36 40 L66 46 L96 34 L126 38 L156 26 L186 30 L216 18 L216 60 L6 60 Z" fill="rgba(22,163,74,0.08)" />
                <path
                  d="M6 44 L36 40 L66 46 L96 34 L126 38 L156 26 L186 30 L216 18"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="mb-1.5 font-bold tracking-tight">Ads that drive profit.</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Track performance and optimize advertising where it matters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
