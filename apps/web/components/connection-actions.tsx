'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, Plug, RefreshCw } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

const AUTHORIZE_PATH = '/api/v1/amazon/connections/seller-central/authorize';
const MOCK_PATH = '/api/v1/amazon/connections/seller-central/mock';

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Amazon SP-API is not configured on the server yet. Set the AMAZON_* environment variables and restart to enable live connections.',
  invalid_state: 'The Amazon authorization could not be verified. Please start the connection again.',
  authorization_denied: 'Amazon authorization was cancelled or denied.',
  token_exchange_failed: 'Amazon authorization completed, but the token exchange failed. Please try again.',
  missing_oauth_parameters: 'Amazon returned an incomplete authorization response. Please try again.',
  invalid_login_request: 'Amazon returned an invalid authorization request.',
  untrusted_callback: 'Amazon returned an untrusted callback URL.',
  connection_store_failed: 'The Amazon connection could not be stored. Check that migration 0006_amazon_sp_api.sql has been applied.',
  authorization_error: 'Amazon returned an error during authorization.',
};

function StatusBanner() {
  const params = useSearchParams();
  const connected = params.get('connected');
  const sync = params.get('sync');
  const error = params.get('error');

  if (connected) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        Amazon seller {connected} connected successfully. Initial sync{' '}
        {sync === 'queued'
          ? 'queued in the background.'
          : sync === 'started'
            ? 'started — follow progress on Sync History.'
            : sync === 'failed'
              ? 'could not start — trigger it manually from Sync History.'
              : 'status unknown'}.
      </div>
    );
  }
  if (error) {
    const detail = params.get('detail');
    const message = ERROR_MESSAGES[error] ?? `Amazon connection failed (${error}${detail ? `: ${detail}` : ''}).`;
    return (
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">
        {message}
      </div>
    );
  }
  return null;
}

function ConnectionActions() {
  const router = useRouter();
  const [mockState, setMockState] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');

  const connectMock = async () => {
    setMockState('connecting');
    try {
      const response = await fetch(MOCK_PATH, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setMockState('connected');
      router.refresh();
    } catch {
      setMockState('failed');
    }
  };

  return (
    <div className="mb-5 flex flex-col gap-4">
      <StatusBanner />
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={AUTHORIZE_PATH}
          className={cn(
            'flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90',
          )}
        >
          Connect Amazon
          <ArrowUpRight className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={connectMock}
          disabled={mockState === 'connecting'}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition hover:bg-accent disabled:opacity-60"
        >
          {mockState === 'connecting' ? <RefreshCw className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
          Connect Mock (dev)
        </button>
        {mockState === 'connected' && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Mock account connected.</span>}
        {mockState === 'failed' && <span className="text-sm font-medium text-amber-600">Mock connection failed.</span>}
        <span className="text-xs text-muted-foreground">Mock mode keeps development working without Amazon credentials.</span>
      </div>
    </div>
  );
}

export function ConnectionActionsPanel() {
  return (
    <Suspense fallback={null}>
      <ConnectionActions />
    </Suspense>
  );
}
