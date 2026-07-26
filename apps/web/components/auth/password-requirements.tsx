'use client';
import { Check, X } from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { rules, passwordMeetsRequirements } from '@/lib/password-rules';

export { rules, passwordMeetsRequirements };

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
      {rules.map((r) => {
        const met = r.test(password);
        return (
          <li key={r.label} className={cn('flex items-center gap-1.5', met ? 'text-primary' : 'text-muted-foreground')}>
            {met ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
