'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@amazon-profit/ui';
import { cn } from '@amazon-profit/utils';
import { ConfirmDialog } from './confirm-dialog';

// Admin sync retry. Always confirms first; the server re-checks authorization,
// duplicate-run guards, connection status and the sync_retry_enabled setting.
export function SyncRetryButton({
  syncRunId,
  amazonAccountId,
  label = 'Retry sync',
  size = 'sm',
}: {
  syncRunId?: string;
  amazonAccountId?: string;
  label?: string;
  size?: 'sm' | 'default';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/sync/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncRunId ? { syncRunId } : { amazonAccountId }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? `Retry failed (HTTP ${response.status}).`);
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError('Retry failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        variant="outline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={done}
      >
        <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} />
        {busy ? 'Retrying…' : done ? 'Retry started' : label}
      </Button>
      <ConfirmDialog
        open={open}
        title="Retry synchronization?"
        description="This re-runs the existing sync pipeline for this account over the recent window. A sync that is already in progress is never duplicated. The action is recorded in the audit log."
        confirmLabel="Retry sync"
        busy={busy}
        error={error}
        onConfirm={submit}
        onCancel={() => !busy && setOpen(false)}
      />
    </>
  );
}
