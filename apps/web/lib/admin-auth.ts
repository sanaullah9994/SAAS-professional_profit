// Platform-admin authorization. Deny by default.
//
// Authorization is decided exclusively server-side from:
//   1. the better-auth session (validated against Postgres), and
//   2. the users row's platform_role column (or the ADMIN_OWNER_EMAILS env
//      allowlist, which only exists on the server).
// Client-supplied role values, query params, localStorage or profile fields are
// never consulted. There is no API path that writes platform_role — promotion
// happens through the operator-only promote script or the env allowlist.
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from '@amazon-profit/db';
import { auth } from './auth-server';

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  /** True when access comes from the ADMIN_OWNER_EMAILS allowlist rather than users.platform_role. */
  viaAllowlist: boolean;
}

export type PlatformAdminGate =
  | { status: 'ok'; admin: PlatformAdmin }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

// Comma-separated list of emails granted platform-owner access without a DB
// write. Bootstrap mechanism: set ADMIN_OWNER_EMAILS, sign in as that user,
// then (optionally) persist the role with `pnpm admin:promote <email>`.
// Empty/unset means nobody is granted access this way.
export function adminAllowlistEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_OWNER_EMAILS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getPlatformAdminGate(requestHeaders?: Headers): Promise<PlatformAdminGate> {
  try {
    const session = await auth.api.getSession({ headers: requestHeaders ?? (await headers()) });
    const userId = session?.user?.id;
    if (!userId) return { status: 'unauthenticated' };

    const { rows } = await query<{
      id: string;
      email: string;
      name: string;
      platform_role: string;
      suspended_at: Date | null;
    }>(`SELECT id, email, name, platform_role, suspended_at FROM users WHERE id = $1`, [userId]);
    const user = rows[0];
    if (!user) return { status: 'forbidden' };
    // A suspended account keeps no privileges, even if a session cookie survives.
    if (user.suspended_at) return { status: 'forbidden' };
    if (user.platform_role === 'owner') {
      return { status: 'ok', admin: { id: user.id, email: user.email, name: user.name, viaAllowlist: false } };
    }
    if (adminAllowlistEmails().has(user.email.toLowerCase())) {
      return { status: 'ok', admin: { id: user.id, email: user.email, name: user.name, viaAllowlist: true } };
    }
    return { status: 'forbidden' };
  } catch (error) {
    // Any failure to verify (DB down, migration missing, session invalid) denies access.
    console.error('[admin-auth] platform admin check failed:', error instanceof Error ? error.message : error);
    return { status: 'forbidden' };
  }
}

// For admin API route handlers: returns the actor or a ready-to-send 401/403.
export async function requirePlatformAdminApi(
  requestHeaders?: Headers,
): Promise<{ admin: PlatformAdmin } | { response: NextResponse }> {
  const gate = await getPlatformAdminGate(requestHeaders);
  if (gate.status === 'ok') return { admin: gate.admin };
  if (gate.status === 'unauthenticated') {
    return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }
  return { response: NextResponse.json({ error: 'Platform administrator access required.' }, { status: 403 }) };
}

// For admin pages (server components). Unauthenticated visitors are sent to
// login; authenticated non-admins get a plain redirect to the customer
// dashboard (middleware already gates cookie presence for /admin routes).
export async function requirePlatformAdminPage(): Promise<PlatformAdmin> {
  const gate = await getPlatformAdminGate();
  if (gate.status === 'ok') return gate.admin;
  if (gate.status === 'unauthenticated') redirect('/login?redirect=/admin');
  redirect('/dashboard');
}
