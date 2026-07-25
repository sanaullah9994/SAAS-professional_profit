import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSessionCookie } from 'better-auth/cookies';
import { LoginForm } from './login-form';

export default async function Page() {
  const sessionCookie = getSessionCookie(await headers());
  if (sessionCookie) redirect('/dashboard');

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
