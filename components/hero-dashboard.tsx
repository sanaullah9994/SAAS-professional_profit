import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  PackageSearch,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";

const points =
  "0,104 40,92 78,97 118,70 160,76 202,48 242,56 284,30 324,40 366,20 410,25 454,7";

const rows = [
  ["Total sales", "$84,920", "+12.8%", "good"],
  ["Amazon fees", "$19,340", "22.8%", "neutral"],
  ["PPC spend", "$12,760", "15.0%", "warn"],
  ["Net profit", "$21,486", "+18.4%", "good"],
];

function Kpi({
  label,
  value,
  change,
  positive = true,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
        <MoreHorizontal className="size-3 text-slate-300" />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-base font-bold tracking-[-0.04em] text-slate-900">
          {value}
        </span>
        <span
          className={`inline-flex items-center text-[9px] font-bold ${
            positive ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {positive ? (
            <ArrowUpRight className="size-2.5" />
          ) : (
            <ArrowDownRight className="size-2.5" />
          )}
          {change}
        </span>
      </div>
    </div>
  );
}

export function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[720px] lg:mx-0">
      <div className="absolute -inset-7 -z-10 rounded-[40px] bg-gradient-to-br from-violet-200/70 via-white to-cyan-100/70 blur-2xl" />
      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_34px_90px_-36px_rgba(50,38,100,.42)]">
        <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="flex h-6 w-44 items-center justify-center rounded-md border border-slate-200 bg-white text-[8px] font-medium text-slate-400">
            app.professionalprofit.io
          </div>
          <div className="w-12" />
        </div>

        <div className="grid min-h-[420px] grid-cols-[105px_1fr] sm:grid-cols-[132px_1fr]">
          <aside className="border-r border-slate-200 bg-[#fbfbfd] p-3">
            <div className="flex items-center gap-2 px-1 py-1.5">
              <div className="grid size-6 place-items-center rounded-lg bg-violet-700 text-white">
                <Sparkles className="size-3" />
              </div>
              <span className="hidden text-[10px] font-bold text-slate-900 sm:block">
                Pro Profit
              </span>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-[7px] font-bold uppercase tracking-wider text-slate-400">
                Account
              </div>
              <div className="mt-1 flex items-center justify-between gap-1 text-[9px] font-semibold text-slate-700">
                Northstar <ChevronDown className="size-2.5" />
              </div>
            </div>
            <div className="mt-5 space-y-1">
              {[
                [LayoutDashboard, "Overview", true],
                [CircleDollarSign, "Profit", false],
                [Megaphone, "PPC analytics", false],
                [Gauge, "Day to day", false],
                [BarChart3, "Traffic", false],
                [PackageSearch, "Inventory", false],
              ].map(([Icon, text, active]) => {
                const I = Icon as typeof LayoutDashboard;
                return (
                  <div
                    key={text as string}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[8px] font-semibold sm:text-[9px] ${
                      active
                        ? "bg-violet-100 text-violet-800"
                        : "text-slate-500"
                    }`}
                  >
                    <I className="size-3" />
                    <span>{text as string}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-[8px] font-semibold text-slate-500 sm:text-[9px]">
                <Settings2 className="size-3" /> Settings
              </div>
            </div>
          </aside>

          <main className="min-w-0 bg-[#f7f8fb] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-semibold text-violet-700">
                  Good morning, Alex
                </div>
                <h3 className="mt-0.5 text-sm font-bold tracking-[-0.03em] text-slate-950 sm:text-base">
                  Profit overview
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400">
                  <Search className="size-3" />
                </button>
                <button className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400">
                  <Bell className="size-3" />
                </button>
                <div className="grid size-7 place-items-center rounded-lg bg-slate-900 text-[8px] font-bold text-white">
                  AP
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
              <Kpi label="Revenue" value="$84.9K" change="12.8%" />
              <Kpi label="Net profit" value="$21.5K" change="18.4%" />
              <Kpi label="TACoS" value="15.0%" change="2.1%" positive={false} />
              <Kpi label="Margin" value="25.3%" change="4.2%" />
            </div>

            <div className="mt-2 grid gap-2 xl:grid-cols-[1.35fr_.8fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-slate-800">
                      Profit performance
                    </div>
                    <div className="mt-0.5 text-[7px] text-slate-400">
                      Revenue and net profit · Last 30 days
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 px-2 py-1 text-[7px] font-semibold text-slate-500">
                    30 days
                  </div>
                </div>
                <div className="relative mt-4 h-[112px] overflow-hidden">
                  <div className="absolute inset-0 grid grid-rows-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="border-t border-dashed border-slate-100"
                      />
                    ))}
                  </div>
                  <svg
                    viewBox="0 0 454 112"
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="hero-profit-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#7c3aed"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#7c3aed"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`${points} 454,112 0,112`}
                      fill="url(#hero-profit-fill)"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#6d28d9"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="454"
                      cy="7"
                      r="4"
                      fill="#6d28d9"
                      stroke="white"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="mt-1 flex justify-between text-[6px] font-medium text-slate-300">
                  <span>Jun 1</span>
                  <span>Jun 7</span>
                  <span>Jun 14</span>
                  <span>Jun 21</span>
                  <span>Jun 30</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-[9px] font-bold text-slate-800">
                  Profit composition
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <div className="relative grid size-24 place-items-center rounded-full bg-[conic-gradient(#6d28d9_0_42%,#22c55e_42%_67%,#f59e0b_67%_82%,#e2e8f0_82%_100%)]">
                    <div className="grid size-16 place-items-center rounded-full bg-white text-center">
                      <div>
                        <div className="text-[7px] font-medium text-slate-400">
                          Profit
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">
                          25.3%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-y-2 text-[7px] font-semibold text-slate-500">
                  <span>
                    <i className="mr-1 inline-block size-1.5 rounded-full bg-violet-700" />
                    COGS
                  </span>
                  <span>
                    <i className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
                    Profit
                  </span>
                  <span>
                    <i className="mr-1 inline-block size-1.5 rounded-full bg-amber-500" />
                    PPC
                  </span>
                  <span>
                    <i className="mr-1 inline-block size-1.5 rounded-full bg-slate-200" />
                    Fees
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <span className="text-[9px] font-bold text-slate-800">
                  Today&apos;s business pulse
                </span>
                <span className="text-[7px] font-semibold text-violet-700">
                  View report →
                </span>
              </div>
              <div className="grid grid-cols-[1fr_.8fr_.6fr] bg-slate-50 px-3 py-2 text-[7px] font-bold uppercase tracking-wider text-slate-400">
                <span>Metric</span>
                <span>Current</span>
                <span>Change</span>
              </div>
              {rows.map(([label, value, change, tone]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1fr_.8fr_.6fr] border-t border-slate-100 px-3 py-2 text-[8px]"
                >
                  <span className="font-medium text-slate-500">{label}</span>
                  <span className="font-bold text-slate-800">{value}</span>
                  <span
                    className={`font-bold ${tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-rose-500" : "text-slate-500"}`}
                  >
                    {change}
                  </span>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_45px_-25px_rgba(30,41,59,.55)] sm:flex">
        <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <ArrowUpRight className="size-4" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400">
            Profit opportunity
          </div>
          <div className="text-xs font-extrabold text-slate-900">
            +$3,280 identified
          </div>
        </div>
      </div>
    </div>
  );
}
