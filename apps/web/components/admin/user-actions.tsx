'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@amazon-profit/ui';
import { ConfirmDialog } from './confirm-dialog';

// Suspend / reactivate controls. The server independently enforces the rules
// (no self-suspension, last-owner protection); this is presentation only.
export function UserActions({
  userId,
  userName,
  suspended,
  canSuspend = true,
}: {
  userId: string;
  userName: string;
  suspended: boolean;
  canSuspend?: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'suspend' | 'reactivate' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setDialog(null);
    setError(null);
    setReason('');
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/${dialog === 'suspend' ? 'suspend' : 'reactivate'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dialog === 'suspend' ? { reason: reason.trim() || undefined } : {}),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? `Request failed (HTTP ${response.status}).`);
        return;
      }
      setDialog(null);
      setReason('');
      router.refresh();
    } catch {
      setError('Request failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {suspended ? (
          <Button size="sm" variant="outline" onClick={() => setDialog('reactivate')}>
            Reactivate
          </Button>
        ) : (
          <Button size="sm" variant="destructive" disabled={!canSuspend} title={canSuspend ? undefined : 'The last platform owner cannot be suspended.'} onClick={() => setDialog('suspend')}>
            Suspend
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={dialog === 'suspend'}
        title={`Suspend ${userName}?`}
        description="The account will be signed out everywhere and blocked from signing in. Workspaces and data are preserved. This action is recorded in the audit log."
        confirmLabel="Suspend account"
        destructive
        busy={busy}
        error={error}
        onConfirm={submit}
        onCancel={close}
      >
        <label className="block text-sm font-medium" htmlFor="suspend-reason">
          Reason <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="suspend-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          placeholder="e.g. payment dispute"
          className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'reactivate'}
        title={`Reactivate ${userName}?`}
        description="The account will be able to sign in again. This action is recorded in the audit log."
        confirmLabel="Reactivate account"
        busy={busy}
        error={error}
        onConfirm={submit}
        onCancel={close}
      />
    </>
  );
}
