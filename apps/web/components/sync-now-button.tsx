'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

type SyncBody = { status?: string; incomplete?: boolean; nextFrom?: string | null; error?: string };

const MAX_ROUNDS = 6;

export function SyncNowButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'syncing' | 'done' | 'failed'>('idle');

  const runSync = async () => {
    setState('syncing');
    try {
      let from: string | undefined;
      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const response = await fetch('/api/v1/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(from ? { from } : {}),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as SyncBody;
        if (body.status === 'failed') throw new Error(body.error ?? 'sync failed');
        if (!body.incomplete || !body.nextFrom || body.nextFrom === from) break;
        from = body.nextFrom;
      }
      setState('done');
    } catch {
      setState('failed');
    } finally {
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={runSync}
      disabled={state === 'syncing'}
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-accent disabled:opacity-60"
    >
      <RefreshCw className={cn('size-3.5', state === 'syncing' && 'animate-spin')} />
      {state === 'syncing' ? 'Syncing…' : state === 'done' ? 'Synced' : state === 'failed' ? 'Sync failed' : 'Sync now'}
    </button>
  );
}
