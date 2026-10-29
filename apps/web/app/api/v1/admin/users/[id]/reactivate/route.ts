import { NextRequest, NextResponse } from 'next/server';
import { getPlatformUserById, setPlatformUserSuspended } from '@amazon-profit/db';
import { requirePlatformAdminApi } from '@/lib/admin-auth';
import { recordAuditLog } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authz = await requirePlatformAdminApi(request.headers);
  if ('response' in authz) return authz.response;
  const { admin } = authz;

  const { id } = await context.params;
  if (!id || id.length > 100) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  const auditBase = {
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: 'user.reactivate' as const,
    entityType: 'user',
    entityId: id,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
  };

  try {
    const target = await getPlatformUserById(id);
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (!target.suspended_at) {
      return NextResponse.json({ error: 'This account is not suspended.' }, { status: 409 });
    }

    const updated = await setPlatformUserSuspended(id, false, null);
    if (!updated) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    await recordAuditLog({ ...auditBase, success: true, metadata: { email: target.email } });
    return NextResponse.json({ ok: true, user: { id: updated.id, email: updated.email, suspended_at: null } });
  } catch (error) {
    await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'exception' } });
    console.error('[admin] reactivate failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to reactivate the account.' }, { status: 500 });
  }
}
