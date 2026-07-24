import { Suspense } from 'react';
import { ResetPasswordForm } from './reset-password-form';

export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
