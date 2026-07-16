"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  MousePointerClick,
  SearchCheck,
  ShoppingCart,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "profit",
    label: "Profit intelligence",
    icon: CircleDollarSign,
    title: "Know exactly what you earn — after every cost.",
    copy: "See revenue, Amazon fees, COGS, returns, ad spend, and net profit in one clear view. Drill down by marketplace, brand, parent ASIN, or SKU.",
    metric: "$21,486",
    metricLabel: "Net profit",
    change: "+18.4%",
    bars: [42, 55, 48, 65, 58, 76, 84, 73, 88, 94],
  },
  {
    id: "ppc",
    label: "PPC analytics",
    icon: Target,
    title: "See which campaigns create profit, not just sales.",
    copy: "Connect ad performance with contribution margin. Find wasted spend, profitable search terms, and the true break-even ACoS for every product.",
    metric: "24.8%",
    metricLabel: "Blended ACoS",
    change: "-3.6%",
    bars: [88, 76, 81, 68, 62, 58, 54, 48, 44, 39],
  },
  {
    id: "growth",
    label: "Growth signals",
    icon: BarChart3,
    title: "Turn daily changes into clear next actions.",
    copy: "Compare sales, sessions, CVR, CPC, organic share, and inventory risk in one timeline so your team can act before small issues become expensive.",
    metric: "+12.8%",
    metricLabel: "Revenue growth",
    change: "+4.2 pts",
    bars: [34, 40, 45, 41, 53, 60, 64, 72, 78, 91],
  },
];

const tableRows = [
  ["Brand defence", "$18,420", "$2,210", "12.0%", "+$4,380"],
  ["Non-brand exact", "$12,680", "$3,460", "27.3%", "+$2,140"],
  ["Competitor", "$6,940", "$2,980", "42.9%", "-$420"],
  ["Auto discovery", "$8,230", "$2,140", "26.0%", "+$1,280"],
];

export function InteractiveAnalytics() {
  const [activeId, setActiveId] = useState("profit");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div className="grid items-stretch gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-12">
      <div className="flex flex-col justify-center">
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition-all",
                  selected
                    ? "bg-white text-violet-800 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl",
                    selected ? "bg-violet-100" : "bg-white",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="mt-8" key={active.id}>
          <h3 className="max-w-xl text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            {active.title}
          </h3>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            {active.copy}
          </p>
          <a
            href="#pricing"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-900"
          >
            Explore this report <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-45px_rgba(30,41,59,.42)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold text-slate-400">
              Performance workspace
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              Northstar Home · US
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            Last 30 days
          </div>
        </div>
        <div className="bg-[#f7f8fb] p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-400">
                    {active.metricLabel}
                  </div>
                  <div className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-slate-950">
                    {active.metric}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {active.change}
                </span>
              </div>
              <div className="mt-8 flex h-28 items-end gap-2">
                {active.bars.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-md bg-violet-100 transition-all duration-500"
                    style={{ height: `${height}%` }}
                  >
                    <div
                      className="h-full rounded-t-md bg-gradient-to-t from-violet-700 to-violet-400"
                      style={{ opacity: 0.45 + index / 18 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] font-medium text-slate-400">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-400">
                Efficiency score
              </div>
              <div className="mt-5 grid place-items-center">
                <div className="relative grid size-28 place-items-center rounded-full bg-[conic-gradient(#6d28d9_0_78%,#ede9fe_78%_100%)]">
                  <div className="grid size-20 place-items-center rounded-full bg-white">
                    <div className="text-center">
                      <strong className="text-2xl font-extrabold text-slate-950">
                        78
                      </strong>
                      <div className="text-[10px] font-semibold text-slate-400">
                        Healthy
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-[11px] font-semibold leading-5 text-emerald-800">
                3 high-impact opportunities found
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-bold text-slate-800">
                Campaign profitability
              </div>
              <div className="text-[11px] font-semibold text-violet-700">
                View all
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[570px]">
                <div className="grid grid-cols-[1.35fr_repeat(4,1fr)] bg-slate-50 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">
                  <span>Campaign</span>
                  <span>Sales</span>
                  <span>Spend</span>
                  <span>ACoS</span>
                  <span>Profit</span>
                </div>
                {tableRows.map((row, index) => (
                  <div
                    key={row[0]}
                    className="grid grid-cols-[1.35fr_repeat(4,1fr)] items-center border-t border-slate-100 px-4 py-3 text-[11px]"
                  >
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <i
                        className={cn(
                          "size-2 rounded-full",
                          index === 2 ? "bg-rose-400" : "bg-emerald-400",
                        )}
                      />
                      {row[0]}
                    </span>
                    <span className="font-semibold text-slate-600">
                      {row[1]}
                    </span>
                    <span className="text-slate-500">{row[2]}</span>
                    <span className="text-slate-500">{row[3]}</span>
                    <span
                      className={cn(
                        "font-bold",
                        row[4].startsWith("-")
                          ? "text-rose-600"
                          : "text-emerald-600",
                      )}
                    >
                      {row[4]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [BadgeDollarSign, "Break-even ACoS", "31.4%"],
              [MousePointerClick, "CTR", "0.62%"],
              [ShoppingCart, "CVR", "18.7%"],
              [SearchCheck, "Organic share", "54.2%"],
            ].map(([Icon, label, value]) => {
              const I = Icon as typeof BadgeDollarSign;
              return (
                <div
                  key={label as string}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <I className="size-3.5 text-violet-700" />
                  <div className="mt-3 text-[9px] font-semibold text-slate-400">
                    {label as string}
                  </div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {value as string}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
