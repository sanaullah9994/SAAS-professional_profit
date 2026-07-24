'use client';
import { Check, X } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

const SPECIAL_CHAR = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export const rules = [
  { label: '8–128 characters', test: (p: string) => p.length >= 8 && p.length <= 128 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => SPECIAL_CHAR.test(p) },
];

export function passwordMeetsRequirements(password: string) {
  return rules.every((r) => r.test(password));
}

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
