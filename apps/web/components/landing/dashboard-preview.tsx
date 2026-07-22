'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { LogoMark } from '@/components/marketing/logo';

const sidebarLinks = ['Overview', 'Clients', 'Accounts', 'Profit Analysis', 'Advertising', 'Products', 'Reports'];

const metrics = [
  { label: 'Total Revenue', end: 2.48, prefix: '$', suffix: 'M', dec: 2, change: '↑ 18.7%', valueClass: '' },
  { label: 'Net Profit', end: 542, prefix: '$', suffix: 'K', dec: 0, change: '↑ 32.4%', valueClass: 'text-primary' },
  { label: 'Ad Spend', end: 312, prefix: '$', suffix: 'K', dec: 0, change: '↓ 5.1%', valueClass: '' },
  { label: 'TACoS', end: 12.6, prefix: '', suffix: '%', dec: 1, change: '↓ 3.2pp', valueClass: '' },
  { label: 'Clients', end: 7, prefix: '', suffix: '', dec: 0, change: 'active', valueClass: '', changeMuted: true },
];

const donutSegments = [
  { len: 109.7, gap: 217, offset: 0, color: '#16A34A' },
  { len: 77.2, gap: 249.5, offset: -109.7, color: '#34b364' },
  { len: 57.9, gap: 268.8, offset: -186.9, color: '#63c68b' },
  { len: 47, gap: 279.7, offset: -244.8, color: '#9bd9b3' },
  { len: 35, gap: 291.7, offset: -291.8, color: '#cbe9d5' },
];

export function DashboardPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const countRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (lineRef.current) {
        const len = lineRef.current.getTotalLength();
        gsap.set(lineRef.current, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(lineRef.current, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out', delay: 0.3 });
      }
      gsap.fromTo('[data-donut-seg]', { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.4, stagger: 0.12 });
      gsap.fromTo('[data-metric]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', delay: 0.55 });

      metrics.forEach((m, i) => {
        const el = countRefs.current[i];
        if (!el) return;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: m.end,
          duration: 1.2,
          ease: 'power2.out',
          delay: 0.15 + i * 0.05,
          onUpdate: () => {
            el.textContent = m.prefix + obj.v.toFixed(m.dec) + m.suffix;
          },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(20,22,26,0.04),0_20px_48px_-28px_rgba(20,22,26,0.12)]">
      <div className="grid grid-cols-[150px_1fr]">
        <aside className="flex flex-col gap-0.5 border-r border-border bg-muted/40 p-3">
          <div className="mb-3.5 flex items-center gap-1.5 px-1.5">
            <LogoMark size={16} />
            <span className="text-[13px] font-extrabold">ProfitPilot</span>
          </div>
          <div className="rounded-lg bg-foreground/[0.06] px-2.5 py-2 text-xs font-bold">{sidebarLinks[0]}</div>
          {sidebarLinks.slice(1).map((label) => (
            <div key={label} className="px-2.5 py-2 text-xs font-medium text-muted-foreground">
              {label}
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5">
            <span className="flex size-[22px] items-center justify-center rounded-full bg-foreground/10 text-[9px] font-bold text-muted-foreground">
              AC
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">Agency Inc.</span>
          </div>
        </aside>

        <div className="p-4">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold">Overview</span>
              <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                All Clients ▾
              </span>
            </div>
            <span className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              May 1 – 31, 2024
            </span>
          </div>

          <div className="mb-3.5 grid grid-cols-5 gap-2">
            {metrics.map((m, i) => (
              <div key={m.label} data-metric className="rounded-[10px] border border-border p-2.5">
                <div className="mb-1 text-[9.5px] font-semibold text-muted-foreground">{m.label}</div>
                <div
                  ref={(el) => {
                    countRefs.current[i] = el;
                  }}
                  className={`text-[15px] font-extrabold tracking-tight ${m.valueClass}`}
                >
                  {m.prefix}0{m.suffix}
                </div>
                <div className={`text-[9.5px] font-bold ${m.changeMuted ? 'text-muted-foreground' : 'text-primary'}`}>{m.change}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-2">
            <div className="rounded-[10px] border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold">Net Profit Over Time</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Monthly ▾</span>
              </div>
              <svg width="100%" height="118" viewBox="0 0 300 118" preserveAspectRatio="none" className="block">
                <line x1="0" y1="30" x2="300" y2="30" stroke="var(--border)" strokeWidth={1} />
                <line x1="0" y1="62" x2="300" y2="62" stroke="var(--border)" strokeWidth={1} />
                <line x1="0" y1="94" x2="300" y2="94" stroke="var(--border)" strokeWidth={1} />
                <path d="M10 96 L44 88 L78 92 L112 74 L146 80 L180 60 L214 66 L248 42 L282 24 L282 118 L10 118 Z" fill="rgba(22,163,74,0.08)" />
                <path
                  ref={lineRef}
                  d="M10 96 L44 88 L78 92 L112 74 L146 80 L180 60 L214 66 L248 42 L282 24"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-0.5 flex justify-between text-[8.5px] font-semibold text-muted-foreground">
                {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>

            <div className="rounded-[10px] border border-border p-3">
              <div className="mb-1.5 text-[11px] font-bold">Profit by Client</div>
              <div className="flex items-center justify-center">
                <svg width="110" height="110" viewBox="0 0 120 120">
                  <g transform="rotate(-90 60 60)">
                    {donutSegments.map((s, i) => (
                      <circle
                        key={i}
                        data-donut-seg
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke={s.color}
                        strokeWidth={15}
                        strokeDasharray={`${s.len} ${s.gap}`}
                        strokeDashoffset={s.offset}
                      />
                    ))}
                  </g>
                  <text x="60" y="56" textAnchor="middle" fontSize="17" fontWeight={800} fill="#16A34A">
                    $542K
                  </text>
                  <text x="60" y="70" textAnchor="middle" fontSize="8" fontWeight={600} fill="var(--muted-foreground)">
                    Total Profit
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
