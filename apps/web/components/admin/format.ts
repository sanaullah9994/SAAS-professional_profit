// Shared formatting helpers for admin server pages. Timestamps render in UTC
// so server output is deterministic regardless of host timezone.
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return 'never';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function marketplaceLabel(id: string | null | undefined): string {
  if (!id) return '—';
  return id === 'ATVPDKIKX0DER' ? 'Amazon US' : id;
}
