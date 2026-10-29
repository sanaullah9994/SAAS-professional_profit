import { NextRequest, NextResponse } from 'next/server';
import { getPlatformUserById, countActivePlatformOwners, setPlatformUserSuspended } from '@amazon-profit/db';
import { requirePlatformAdminApi } from '@/lib/admin-auth';
import { recordAuditLog } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

const REASON_MAX = 200;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authz = await requirePlatformAdminApi(request.headers);
  if ('response' in authz) return authz.response;
  const { admin } = authz;

  const { id } = await context.params;
  if (!id || id.length > 100) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  let reason: string | null = null;
  try {
    const body = (await request.json()) as { reason?: unknown };
    if (typeof body.reason === 'string' && body.reason.trim()) {
      reason = body.reason.trim().slice(0, REASON_MAX);
    }
  } catch {
    reason = null;
  }

  const auditBase = {
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: 'user.suspend' as const,
    entityType: 'user',
    entityId: id,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
    metadata: { reason } as Record<string, unknown>,
  };

  try {
    const target = await getPlatformUserById(id);
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (target.suspended_at) {
      return NextResponse.json({ error: 'This account is already suspended.' }, { status: 409 });
    }
    if (target.id === admin.id) {
      await recordAuditLog({ ...auditBase, success: false, metadata: { reason, error: 'self_suspend_blocked' } });
      return NextResponse.json({ error: 'You cannot suspend your own account.' }, { status: 400 });
    }
    if (target.platform_role === 'owner') {
      const owners = await countActivePlatformOwners();
      if (owners <= 1) {
        await recordAuditLog({ ...auditBase, success: false, metadata: { reason, error: 'last_owner_blocked' } });
        return NextResponse.json({ error: 'The last platform owner cannot be suspended.' }, { status: 403 });
      }
    }

    const updated = await setPlatformUserSuspended(id, true, reason);
    if (!updated) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    await recordAuditLog({ ...auditBase, success: true, metadata: { reason, email: target.email } });
    return NextResponse.json({ ok: true, user: { id: updated.id, email: updated.email, suspended_at: updated.suspended_at } });
  } catch (error) {
    await recordAuditLog({ ...auditBase, success: false, metadata: { reason, error: 'exception' } });
    console.error('[admin] suspend failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to suspend the account.' }, { status: 500 });
  }
}
