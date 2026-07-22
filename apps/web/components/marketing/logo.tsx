export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="13" width="4" height="8" rx="1" fill="var(--primary)" />
      <rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="17" y="3" width="4" height="18" rx="1" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ size = 24, textClassName = 'text-lg font-extrabold tracking-tight' }: { size?: number; textClassName?: string }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className={textClassName}>ProfitPilot</span>
    </span>
  );
}
