const stats = [
  ['-24%', 'avg. TACoS'],
  ['4.1x', 'blended ROAS'],
  ['Daily', 'refresh cadence'],
];

export function AdAnalyticsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div data-animate>
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">Advertising analytics</div>
          <h2 className="mb-4.5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            See exactly which ad spend earns its keep.
          </h2>
          <p className="mb-6 text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
            Tie every advertising dollar back to true profit, not just revenue, so you can defend budgets and cut
            waste with confidence in every client review.
          </p>
          <div className="flex flex-wrap gap-7">
            {stats.map(([value, label]) => (
              <div key={label}>
                <div className="text-3xl font-extrabold tracking-tight text-primary">{value}</div>
                <div className="text-sm font-semibold text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div data-animate className="rounded-2xl border border-border bg-muted/30 p-7">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold">Ad Performance</span>
            <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              ACoS ▾
            </span>
          </div>
          <svg width="100%" height="150" viewBox="0 0 320 150" preserveAspectRatio="none" className="block">
            <line x1="0" y1="40" x2="320" y2="40" stroke="var(--border)" strokeWidth={1} />
            <line x1="0" y1="80" x2="320" y2="80" stroke="var(--border)" strokeWidth={1} />
            <line x1="0" y1="120" x2="320" y2="120" stroke="var(--border)" strokeWidth={1} />
            <path d="M12 96 L52 100 L92 88 L132 104 L172 82 L212 92 L252 70 L292 62 L292 150 L12 150 Z" fill="rgba(22,163,74,0.07)" />
            <path
              d="M12 96 L52 100 L92 88 L132 104 L172 82 L212 92 L252 70 L292 62"
              fill="none"
              stroke="#16A34A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted-foreground">
            {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
