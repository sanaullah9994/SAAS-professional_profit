import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';

const execFileAsync = promisify(execFile);

export const repoRoot = path.resolve(__dirname, '..', '..', '..');
export const webAppDir = path.resolve(__dirname, '..');
export const migrationsBuilt = path.join(repoRoot, 'packages', 'db', 'dist', 'migrate.js');

export type Db = typeof import('@amazon-profit/db');

const RUN = randomBytes(4).toString('hex');

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => (port ? resolve(port) : reject(new Error('could not allocate a free port'))));
    });
  });
}

// Tests must never touch the real (Neon) database.
async function assertSafeDatabaseUrl(url: string): Promise<void> {
  if (url.includes('neon.tech')) throw new Error('refusing to test against the Neon database — set TEST_DATABASE_URL to a disposable local database');
  const envFile = path.join(repoRoot, '.env');
  if (existsSync(envFile)) {
    const contents = await readFile(envFile, 'utf8');
    const production = contents.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
    if (production && production === url) throw new Error('refusing to test against the DATABASE_URL from .env — set TEST_DATABASE_URL to a disposable local database');
  }
}

async function waitForDatabase(db: Db, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await db.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`database never became ready: ${lastError instanceof Error ? lastError.message : lastError}`);
}

async function runMigrations(databaseUrl: string): Promise<void> {
  if (!existsSync(migrationsBuilt)) throw new Error(`missing ${migrationsBuilt} — run "pnpm build:packages" first`);
  await execFileAsync(process.execPath, [migrationsBuilt], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    cwd: repoRoot,
  });
}

export interface TestEnvironment {
  baseUrl: string;
  databaseUrl: string;
  stop(): Promise<void>;
}

export async function startTestEnvironment(): Promise<TestEnvironment> {
  const provided = process.env.TEST_DATABASE_URL;
  if (provided) await assertSafeDatabaseUrl(provided);

  let stopDatabase: (() => Promise<void>) | undefined;
  let databaseUrl = provided ?? '';

  if (!databaseUrl) {
    if (!existsSync(path.join(webAppDir, 'node_modules'))) throw new Error('apps/web/node_modules missing — run "pnpm install" first');
    const port = await freePort();
    const container = `profit-ws-test-${process.pid}-${RUN}`;
    try {
      await execFileAsync('docker', [
        'run', '-d', '--rm', '--name', container,
        '-e', 'POSTGRES_PASSWORD=postgres', '-e', 'POSTGRES_DB=amazon_profit',
        '-p', `127.0.0.1:${port}:5432`,
        process.env.TEST_POSTGRES_IMAGE ?? 'postgres:17-alpine',
      ]);
    } catch (error) {
      throw new Error(`could not start an ephemeral postgres container (${error instanceof Error ? error.message : error}). Either install/launch docker or set TEST_DATABASE_URL to a disposable local database.`);
    }
    databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/amazon_profit`;
    stopDatabase = async () => {
      await execFileAsync('docker', ['rm', '-f', container]).catch(() => undefined);
    };
  }

  process.env.DATABASE_URL = databaseUrl;

  let db: Db | undefined;
  let appDir: string | undefined;
  let server: { child: ReturnType<typeof spawn>; logs: () => string; stop(): Promise<void> } | undefined;
  let baseUrl = '';

  try {
    db = await import('@amazon-profit/db');
    await waitForDatabase(db, 60_000);
    await runMigrations(databaseUrl);

    // Second, isolated Next.js app instance: its own directory and .next output so it
    // never collides with a `pnpm dev` running from the repository checkout.
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'profit-workspace-test-'));
    appDir = path.join(tmp, 'app');
    const skip = new Set(['.next', 'node_modules', '.turbo', '.env', 'tsconfig.tsbuildinfo']);
    await cp(webAppDir, appDir, {
      recursive: true,
      filter: (src) => {
        const first = path.relative(webAppDir, src).split(path.sep)[0] ?? '';
        return !skip.has(first);
      },
    });
    await symlink(path.join(webAppDir, 'node_modules'), path.join(appDir, 'node_modules'), 'dir');

    const tsconfigPath = path.join(appDir, 'tsconfig.json');
    const tsconfig = JSON.parse(await readFile(tsconfigPath, 'utf8'));
    tsconfig.extends = path.join(repoRoot, 'packages', 'config', 'tsconfig.nextjs.json');
    await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    const port = await freePort();
    baseUrl = `http://localhost:${port}`;
    // The test process and the dev server must share these so in-process better-auth
    // calls (getSession with a cookie issued by the server) validate the same signature.
    const secret = randomBytes(32).toString('base64url');
    process.env.BETTER_AUTH_SECRET = secret;
    process.env.BETTER_AUTH_URL = baseUrl;
    process.env.TRUSTED_ORIGINS = baseUrl;
    await writeFile(
      path.join(appDir, '.env'),
      [
        `DATABASE_URL=${databaseUrl}`,
        `BETTER_AUTH_SECRET=${secret}`,
        `BETTER_AUTH_URL=${baseUrl}`,
        `TRUSTED_ORIGINS=${baseUrl}`,
        '',
      ].join('\n'),
    );

    server = await startDevServer(appDir, baseUrl, port);
    await waitForServer(server, baseUrl);

    const started = { baseUrl, databaseUrl, stop: undefined as unknown as () => Promise<void> };
    started.stop = async () => {
      await server?.stop();
      await rm(path.join(appDir!, '..'), { recursive: true, force: true }).catch(() => undefined);
      await stopDatabase?.();
      await db?.pool.end().catch(() => undefined);
    };
    return started;
  } catch (error) {
    await server?.stop().catch(() => undefined);
    if (appDir) await rm(path.join(appDir, '..'), { recursive: true, force: true }).catch(() => undefined);
    await stopDatabase?.().catch(() => undefined);
    await db?.pool.end().catch(() => undefined);
    throw error;
  }
}

async function startDevServer(appDir: string, baseUrl: string, port: number): Promise<{ child: ReturnType<typeof spawn>; logs: () => string; stop(): Promise<void> }> {
  const nextBin = path.join(webAppDir, 'node_modules', '.bin', 'next');
  const chunks: string[] = [];
  const child = spawn(nextBin, ['dev', '--webpack', '-p', String(port)], {
    cwd: appDir,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      // webpack (not turbopack) because turbopack rejects node_modules symlinks
      // that point outside the copied test app directory.
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const capture = (chunk: Buffer) => {
    chunks.push(chunk.toString());
    if (chunks.length > 400) chunks.splice(0, chunks.length - 400);
  };
  child.stdout?.on('data', capture);
  child.stderr?.on('data', capture);
  const logs = () => chunks.join('');

  return {
    child,
    logs,
    stop: async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await new Promise((resolve) => child.once('exit', resolve));
    },
  };
}

async function waitForServer(server: { child: ReturnType<typeof spawn>; logs: () => string }, baseUrl: string): Promise<void> {
  const deadline = Date.now() + 120_000;
  let lastError = 'no response yet';
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) throw new Error(`next dev exited with code ${server.child.exitCode}:\n${server.logs()}`);
    try {
      const response = await fetch(`${baseUrl}/api/auth/get-session`, { signal: AbortSignal.timeout(10_000) });
      if (response.status < 500) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`next dev never became ready (${lastError}):\n${server.logs()}`);
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${RUN}-${Date.now()}@example.com`;
}

export async function createCredentialUser(db: Db, id: string, email: string, password: string): Promise<void> {
  await db.query(`INSERT INTO users(id, name, email, email_verified) VALUES($1, $2, $3, true)`, [id, 'Test User', email]);
  await db.query(
    `INSERT INTO auth_accounts(id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES($1, $1, 'credential', $2, $3, now(), now())`,
    [`${id}-acc`, id, await hashPassword(password)],
  );
}

export async function signIn(baseUrl: string, email: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseUrl },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`sign-in failed with ${response.status}: ${JSON.stringify(body)}`);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('better-auth.session_token='));
  if (!cookie) throw new Error('sign-in response had no session cookie');
  const [rawCookie] = cookie.split(';');
  if (!rawCookie) throw new Error('malformed session cookie');
  return rawCookie;
}

export function getOverview(baseUrl: string, cookie: string): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/dashboard/overview?days=7`, {
    headers: cookie ? { cookie } : {},
    signal: AbortSignal.timeout(60_000),
  });
}

// Makes ensureWorkspaceForUser() fail for the `blocked-*` fixtures only, so the
// "genuinely missing workspace" path can be exercised. Always drop in a finally.
export async function blockWorkspaceProvisioning(db: Db): Promise<void> {
  await db.query(`CREATE OR REPLACE FUNCTION ws_test_block_provisioning() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'workspace provisioning blocked by test'; END $$`);
  await db.query(
    `CREATE TRIGGER ws_test_block_provisioning BEFORE INSERT ON organizations
     FOR EACH ROW WHEN (NEW.slug LIKE 'u-blocked-%')
     EXECUTE FUNCTION ws_test_block_provisioning()`,
  );
}

export async function allowWorkspaceProvisioning(db: Db): Promise<void> {
  await db.query(`DROP TRIGGER IF EXISTS ws_test_block_provisioning ON organizations`);
  await db.query(`DROP FUNCTION IF EXISTS ws_test_block_provisioning()`);
}
