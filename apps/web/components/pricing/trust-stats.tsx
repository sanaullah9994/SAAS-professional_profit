const stats = [
  ['92%', 'of agencies uncover hidden costs in month one'],
  ['9/10', 'users open ProfitPilot every working day'],
  ['$2.4B+', 'in client GMV tracked to true profit'],
  ['14 hrs', 'saved per client team every week'],
];

export function TrustStats() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div data-animate className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-16 text-center sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-24">
        {stats.map(([value, label]) => (
          <div key={label}>
            <div className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">{value}</div>
            <div className="mt-2.5 text-sm font-medium leading-snug text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
