// Service health probes for the admin System Health page. Every check degrades
// to a distinct 'unknown'/'unreachable' status instead of throwing, and none of
// them expose connection strings, env values or stack traces to the browser.
import net from 'node:net';
import tls from 'node:tls';
import { query } from '@amazon-profit/db';

export type HealthState = 'healthy' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  state: HealthState;
  detail: string;
  latencyMs: number | null;
}

const PROBE_TIMEOUT_MS = 2_500;

export async function checkWebApp(): Promise<HealthCheck> {
  return {
    name: 'Web application',
    state: 'healthy',
    detail: 'This page was served successfully.',
    latencyMs: null,
  };
}

export async function checkPostgres(): Promise<HealthCheck> {
  const started = Date.now();
  try {
    await query('SELECT 1');
    return { name: 'PostgreSQL', state: 'healthy', detail: 'Query executed successfully.', latencyMs: Date.now() - started };
  } catch {
    return { name: 'PostgreSQL', state: 'unhealthy', detail: 'Database unreachable.', latencyMs: Date.now() - started };
  }
}

// Minimal RESP PING over TCP/TLS so the web app needs no Redis client dependency.
async function redisPing(url: string): Promise<void> {
  const parsed = new URL(url);
  const useTls = parsed.protocol === 'rediss:';
  const port = Number(parsed.port || (useTls ? 6380 : 6379));
  const host = parsed.hostname;
  const auth = parsed.password ? `AUTH ${decodeURIComponent(parsed.username || 'default')} ${decodeURIComponent(parsed.password)}\r\n` : '';

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };
    const socket = useTls
      ? tls.connect({ host, port, servername: host, rejectUnauthorized: false })
      : net.connect({ host, port });
    const timer = setTimeout(() => finish(new Error('redis ping timed out')), PROBE_TIMEOUT_MS);
    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.on('connect', () => socket.write(`${auth}PING\r\n`));
    socket.on('secureConnect', () => socket.write(`${auth}PING\r\n`));
    socket.on('data', (chunk) => {
      clearTimeout(timer);
      finish(chunk.toString().includes('PONG') ? undefined : new Error('unexpected redis response'));
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      finish(error);
    });
    socket.on('timeout', () => {
      clearTimeout(timer);
      finish(new Error('redis ping timed out'));
    });
  });
}

export async function checkRedis(): Promise<HealthCheck> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return { name: 'Redis', state: 'unknown', detail: 'REDIS_URL is not configured.', latencyMs: null };
  }
  const started = Date.now();
  try {
    await redisPing(url);
    return { name: 'Redis', state: 'healthy', detail: 'PING succeeded.', latencyMs: Date.now() - started };
  } catch {
    return { name: 'Redis', state: 'unhealthy', detail: 'Redis unreachable.', latencyMs: Date.now() - started };
  }
}

// NestJS API health endpoint (apps/api GET /v1/health), when the service runs.
export async function checkNestApi(): Promise<HealthCheck> {
  const base = (process.env.NESTJS_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const started = Date.now();
  try {
    const response = await fetch(`${base}/v1/health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (response.ok) {
      return { name: 'NestJS API', state: 'healthy', detail: 'Health endpoint responded.', latencyMs: Date.now() - started };
    }
    return { name: 'NestJS API', state: 'unhealthy', detail: `Health endpoint returned HTTP ${response.status}.`, latencyMs: Date.now() - started };
  } catch {
    return {
      name: 'NestJS API',
      state: 'unknown',
      detail: 'Not reachable. Set NESTJS_API_URL if the API service runs separately.',
      latencyMs: null,
    };
  }
}

// The worker has no heartbeat endpoint; its observable effect is sync_runs
// activity. Reported honestly as activity-derived, not a live process check.
export async function checkWorker(lastRunAt: Date | null, connectedAccounts: number): Promise<HealthCheck> {
  if (connectedAccounts === 0) {
    return { name: 'Background worker', state: 'unknown', detail: 'No connected Amazon accounts, so no sync activity is expected.', latencyMs: null };
  }
  if (!lastRunAt) {
    return { name: 'Background worker', state: 'unknown', detail: 'Accounts are connected but no sync run has ever been recorded.', latencyMs: null };
  }
  const hoursSince = (Date.now() - new Date(lastRunAt).getTime()) / 3_600_000;
  if (hoursSince <= 3) {
    return {
      name: 'Background worker',
      state: 'healthy',
      detail: `Sync activity recorded ${new Date(lastRunAt).toISOString()} (activity-derived signal).`,
      latencyMs: null,
    };
  }
  return {
    name: 'Background worker',
    state: 'unhealthy',
    detail: `No sync activity for ${Math.round(hoursSince)}h despite ${connectedAccounts} connected account(s) — the worker may be down.`,
    latencyMs: null,
  };
}
