export function AiComingSoon() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div
        data-animate
        className="flex flex-col items-center rounded-[20px] border border-border bg-muted/30 px-6 py-14 text-center sm:px-16 sm:py-20"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Coming soon
        </div>
        <h2 className="mb-4.5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Ask questions. Get answers, in plain language.
        </h2>
        <p className="max-w-lg text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
          AI-powered insights that surface what changed, why profit moved, and where to act next — across every
          client, on demand.
        </p>
      </div>
    </section>
  );
}
