import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@amazon-profit/ui';

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (error) {
    const expired = error === 'TOKEN_EXPIRED';
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{expired ? 'Link expired' : 'Verification failed'}</CardTitle>
            <CardDescription>
              {expired
                ? 'This verification link has expired. Sign in and request a new one from there.'
                : 'This verification link is invalid. Try signing in and requesting a new link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Back to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email verified</CardTitle>
          <CardDescription>Your account is confirmed and you&rsquo;re signed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard">
            <Button className="w-full">Go to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
