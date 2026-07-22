const logos = ['Helix Growth', 'EcomScale', 'Sellersy', 'Launchr', 'PeakPath'];

export function LogoCloud() {
  return (
    <section data-animate className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-muted-foreground">
          Trusted by Amazon agencies managing over <span className="font-bold text-foreground">$2.4B</span> in client GMV
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          {logos.map((name) => (
            <span key={name} className="text-lg font-bold tracking-tight text-muted-foreground/50">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
