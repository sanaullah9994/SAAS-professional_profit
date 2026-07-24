'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@amazon-profit/ui';
import { authClient } from '@/lib/auth-client';
import { PasswordRequirements, passwordMeetsRequirements } from '@/components/auth/password-requirements';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const linkError = searchParams.get('error');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || linkError) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Link expired</CardTitle>
          <CardDescription>This password reset link is invalid or has expired. Request a new one below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button className="w-full">Request a new link</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Your other sessions have been signed out for security. Sign in with your new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">Go to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!passwordMeetsRequirements(password)) return setError('Password does not meet the requirements below.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    const r = await authClient.resetPassword({ newPassword: password, token: token! });
    setSubmitting(false);
    if (r.error) return setError(r.error.message ?? 'This link is invalid or has expired.');
    setDone(true);
    setTimeout(() => router.push('/login'), 2500);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Input type="password" placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordRequirements password={password} />
          </div>
          <Input type="password" placeholder="Confirm new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Reset password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
