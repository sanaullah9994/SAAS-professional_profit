'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@amazon-profit/ui';
import { authClient } from '@/lib/auth-client';
import { checkEmail } from '@/lib/api';

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleHint, setGoogleHint] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    setSubmitting(true);

    const info = await checkEmail(email);
    setGoogleHint(info.providers.includes('google') && !info.providers.includes('credential'));

    const r = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
    setSubmitting(false);
    if (r.error) return setError(r.error.message ?? 'Could not send reset email');
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>If an account exists for that address, we&rsquo;ve sent a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {googleHint && (
            <p className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              This account uses Google Sign-In. You can continue with Google, or use the reset link we sent to create a password.
            </p>
          )}
          <Link href="/login" className="text-sm font-semibold text-primary">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>Enter your email and we&rsquo;ll send you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Input name="email" type="email" placeholder="Email" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
        <Link href="/login" className="mt-4 block text-center text-sm text-primary">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
