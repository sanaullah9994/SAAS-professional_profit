'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@amazon-profit/ui';
import { authClient } from '@/lib/auth-client';
import { checkEmail } from '@/lib/api';
import { PasswordRequirements, passwordMeetsRequirements } from '@/components/auth/password-requirements';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.83z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.12A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.26a12 12 0 0 0 0 10.78z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.12C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  function switchMode(next: 'in' | 'up') {
    setMode(next);
    setError('');
    setPassword('');
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')).trim();
    const name = String(f.get('name') || 'Amazon Seller');

    if (mode === 'up' && !passwordMeetsRequirements(password)) {
      return setError('Password does not meet the requirements below.');
    }

    setSubmitting(true);
    const origin = window.location.origin;
    const r =
      mode === 'in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name, callbackURL: `${origin}/verify-email` });

    if (r.error) {
      if (mode === 'up' && r.error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        const info = await checkEmail(email);
        if (info.providers.includes('google') && !info.providers.includes('credential')) {
          setError(
            <>
              This email already exists and is connected to Google.{' '}
              <button type="button" onClick={googleSignIn} className="font-semibold text-primary underline">
                Continue with Google
              </button>{' '}
              or sign in below once you&rsquo;ve created a password from Settings.
            </>,
          );
        } else {
          setError(
            <>
              Email already registered.{' '}
              <button type="button" onClick={() => switchMode('in')} className="font-semibold text-primary underline">
                Log in
              </button>{' '}
              or{' '}
              <Link href="/forgot-password" className="font-semibold text-primary underline">
                reset your password
              </Link>
              .
            </>,
          );
        }
      } else {
        setError(r.error.message ?? 'Authentication failed');
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    if (mode === 'up') {
      setPendingVerification(email);
      return;
    }
    router.push(redirectTo);
  }

  async function googleSignIn() {
    setError('');
    setGoogleLoading(true);
    const r = await authClient.signIn.social({ provider: 'google', callbackURL: redirectTo });
    if (r.error) {
      setError(r.error.message ?? 'Google sign-in failed');
      setGoogleLoading(false);
    }
  }

  async function resendVerification() {
    if (!pendingVerification) return;
    setResent(false);
    await authClient.sendVerificationEmail({ email: pendingVerification, callbackURL: `${window.location.origin}/verify-email` });
    setResent(true);
  }

  if (pendingVerification) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to <span className="font-semibold text-foreground">{pendingVerification}</span>. Click it to
            activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={resendVerification}>
            Resend verification email
          </Button>
          {resent && <p className="mt-2 text-center text-sm text-primary">Sent again — check your inbox.</p>}
          <button className="mt-4 w-full text-sm text-primary" onClick={() => setPendingVerification(null)}>
            Back to sign in
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === 'in' ? 'Welcome back' : 'Create account'}</CardTitle>
        <CardDescription>Email and password authentication through the NestJS API.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full gap-2.5" type="button" onClick={googleSignIn} disabled={googleLoading}>
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'up' && <Input name="name" placeholder="Name" required />}
          <Input name="email" type="email" placeholder="Email" required />
          <div className="space-y-2">
            <Input name="password" type="password" placeholder="Password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === 'up' && <PasswordRequirements password={password} />}
          </div>
          {mode === 'in' && (
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs font-semibold text-muted-foreground hover:text-primary">
                Forgot password?
              </Link>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <button className="mt-4 w-full text-sm text-primary" onClick={() => switchMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
        </button>
      </CardContent>
    </Card>
  );
}
