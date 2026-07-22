const stats = [
  ['$2.4B', 'client GMV managed'],
  ['120+', 'agencies onboarded'],
  ['14 hrs', 'saved per week'],
];

export function TestimonialSection() {
  return (
    <section id="social" className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <div data-animate>
          <blockquote className="text-balance text-2xl font-bold leading-snug tracking-tight sm:text-4xl">
            &ldquo;We replaced five spreadsheets and two dashboards with ProfitPilot. Now every client review starts
            with real net profit — and our team spends time on strategy, not reconciliation.&rdquo;
          </blockquote>
          <div className="mt-7 flex items-center justify-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/10 text-sm font-bold text-muted-foreground">
              MR
            </span>
            <div className="text-left">
              <div className="text-sm font-bold">Maya Reyes</div>
              <div className="text-xs font-medium text-muted-foreground">Founder, Helix Growth</div>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-10 sm:gap-14">
            {stats.map(([value, label]) => (
              <div key={label}>
                <div className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{value}</div>
                <div className="text-sm font-semibold text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
