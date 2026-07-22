import { KeyRound, Lock, ShieldCheck, Boxes } from 'lucide-react';

const items = [
  {
    icon: KeyRound,
    title: 'OAuth 2.0 connections',
    description: 'Connect Amazon accounts securely — we never see or store passwords.',
  },
  {
    icon: Lock,
    title: 'Encrypted storage',
    description: 'Data encrypted at rest and in transit on SOC 2-ready infrastructure.',
  },
  {
    icon: ShieldCheck,
    title: 'Read-only API access',
    description: 'Least-privilege Amazon access — we read data, never modify accounts.',
  },
  {
    icon: Boxes,
    title: 'Per-client isolation',
    description: "Each client's data is logically isolated, so nothing bleeds across accounts.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" data-animate className="bg-[#14161a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="mb-12 max-w-xl">
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-[#5fd08a]">Security &amp; trust</div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Built to protect your clients&rsquo; financial data.
          </h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-white/55 sm:text-lg">
            ProfitPilot connects to Amazon with least-privilege, read-only access and isolates every client&rsquo;s
            data — so revenue never leaves your control.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <item.icon className="mb-4 size-6 text-[#5fd08a]" strokeWidth={1.6} />
              <h3 className="mb-1.5 font-bold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
