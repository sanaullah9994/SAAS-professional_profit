const lines = [
  ['Gross revenue', '$612,400', false],
  ['Amazon fees', '-$146,120', true],
  ['COGS', '-$203,880', true],
  ['Ad spend', '-$78,300', true],
] as const;

export function ProfitCalcSection() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div data-animate className="order-2 rounded-2xl border border-border bg-card p-7">
            <div className="mb-3.5 text-xs font-bold text-muted-foreground">True Profit — Brand Alpha</div>
            <div className="flex flex-col">
              {lines.map(([label, value, muted]) => (
                <div key={label} className="flex justify-between border-t border-border/70 py-2.5">
                  <span className="text-sm font-medium text-foreground/70">{label}</span>
                  <span className={`text-sm font-bold ${muted ? 'text-muted-foreground' : ''}`}>{value}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t-2 border-border pt-3.5">
                <span className="text-[15px] font-bold">Net profit</span>
                <span className="text-xl font-extrabold tracking-tight text-primary">$184,100</span>
              </div>
              <div className="text-right text-xs font-bold text-primary">30.1% margin</div>
            </div>
          </div>

          <div data-animate className="order-1">
            <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-primary">Profit calculation</div>
            <h2 className="mb-4.5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              True profit, calculated down to the SKU.
            </h2>
            <p className="text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
              Every fee, refund, cost, and ad dollar is reconciled automatically, so the number your client sees is
              the number that actually landed in the bank — no spreadsheets required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
