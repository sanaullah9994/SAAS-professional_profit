'use client';

import { useEffect } from 'react';
import { Button } from '@amazon-profit/ui';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] page error:', error);
  }, [error]);

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This admin page could not load its data. If the problem persists, check that migration 0011 has been applied and the
        database is reachable.
      </p>
      <Button className="mt-5" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
