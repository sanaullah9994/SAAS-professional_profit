'use client';
import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@amazon-profit/ui';
import { authClient } from '@/lib/auth-client';
import { PasswordRequirements, passwordMeetsRequirements } from './password-requirements';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function AccountSecurity() {
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authClient.listAccounts().then((r) => {
      if (cancelled) return;
      const providers = (r.data ?? []).map((a) => a.providerId);
      setHasPassword(providers.includes('credential'));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  return hasPassword ? <ChangePasswordCard /> : <CreatePasswordCard onCreated={() => setHasPassword(true)} />;
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!passwordMeetsRequirements(newPassword)) return setError('New password does not meet the requirements below.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    const r = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setSubmitting(false);
    if (r.error) return setError(r.error.message ?? 'Could not change password');
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Changing your password signs you out of all other devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-sm space-y-4">
          <Input type="password" placeholder="Current password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <div className="space-y-2">
            <Input type="password" placeholder="New password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <PasswordRequirements password={newPassword} />
          </div>
          <Input type="password" placeholder="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-primary">Password updated.</p>}
          <Button disabled={submitting}>{submitting ? 'Saving…' : 'Update password'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreatePasswordCard({ onCreated }: { onCreated: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!passwordMeetsRequirements(newPassword)) return setError('Password does not meet the requirements below.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    const res = await fetch(`${API}/v1/auth/set-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.message ?? 'Could not set password');
    }
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a password</CardTitle>
        <CardDescription>Your account currently only signs in with Google. Add a password to also sign in with email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-sm space-y-4">
          <div className="space-y-2">
            <Input type="password" placeholder="New password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <PasswordRequirements password={newPassword} />
          </div>
          <Input type="password" placeholder="Confirm password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={submitting}>{submitting ? 'Saving…' : 'Create password'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
