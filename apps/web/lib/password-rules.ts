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

export function passwordRequirementError(password: unknown): string | null {
  if (typeof password !== 'string') return null;
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!SPECIAL_CHAR.test(password)) return 'Password must include a special character.';
  return null;
}
