import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-violet-700 shadow-[0_8px_24px_-10px_rgba(91,33,182,.8)]">
        <span className="absolute -left-1 top-2 h-2.5 w-7 -rotate-12 rounded-full bg-white/30" />
        <span className="absolute left-2 top-3 h-2.5 w-5 -rotate-12 rounded-full bg-white" />
        <span className="absolute left-3.5 top-5 h-2.5 w-3.5 -rotate-12 rounded-full bg-violet-200" />
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-extrabold tracking-[-0.03em] text-slate-950 sm:text-base">
          Professional Profit
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Amazon intelligence
        </div>
      </div>
    </div>
  );
}
