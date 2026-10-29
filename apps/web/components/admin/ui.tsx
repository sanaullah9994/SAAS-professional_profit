import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge, Input } from '@amazon-profit/ui';
import { cn } from '@amazon-profit/utils';

export type Tone = 'success' | 'warning' | 'destructive' | 'default' | 'outline';

const toneStyles: Record<Tone, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
  default: 'bg-primary/10 text-primary',
  outline: 'border border-border',
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneStyles[tone])}>{label}</span>;
}

export function syncStatusTone(status: string): Tone {
  if (status === 'completed') return 'success';
  if (status === 'running' || status === 'queued') return 'default';
  if (status === 'failed') return 'destructive';
  if (status === 'partial' || status === 'skipped') return 'warning';
  return 'outline';
}

export function connectionStatusTone(status: string): Tone {
  if (status === 'connected') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'error' || status === 'revoked') return 'destructive';
  return 'outline';
}

export function healthTone(state: string): Tone {
  if (state === 'healthy') return 'success';
  if (state === 'unhealthy') return 'destructive';
  return 'outline';
}

export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  action,
}: {
  title: string;
  description: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

export function SearchForm({
  action,
  placeholder,
  defaultValue,
  extra,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  extra?: Record<string, string>;
}) {
  return (
    <form method="get" action={action} className="flex flex-1 items-center gap-2">
      {extra
        ? Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)
        : null}
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted"
      >
        Search
      </button>
    </form>
  );
}

export function FilterSelect({
  action,
  label,
  name,
  value,
  options,
  extra,
}: {
  action: string;
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  extra?: Record<string, string>;
}) {
  return (
    <form method="get" action={action} className="flex items-center gap-2">
      {extra
        ? Object.entries(extra).map(([key, entry]) => <input key={key} type="hidden" name={key} value={entry} />)
        : null}
      <label className="text-sm font-medium text-muted-foreground" htmlFor={`filter-${name}`}>
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  query,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const pageLink = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) params.set(key, value);
    }
    params.set('page', String(target));
    return `${basePath}?${params.toString()}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={pageLink(page - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 font-medium transition hover:bg-muted"
          >
            <ChevronLeft className="size-3.5" /> Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 opacity-50">
            <ChevronLeft className="size-3.5" /> Previous
          </span>
        )}
        <span className="px-1">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={pageLink(page + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 font-medium transition hover:bg-muted"
          >
            Next <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 opacity-50">
            Next <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
