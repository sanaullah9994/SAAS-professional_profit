import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdminApi } from '@/lib/admin-auth';
import { recordAuditLog } from '@/lib/admin-audit';
import { savePlatformSetting, validateSetting } from '@/lib/admin-settings';

export const dynamic = 'force-dynamic';

// Updates a single platform setting. Keys are validated against the allowlist
// in lib/admin-settings.ts; only settings with real server-side enforcement
// exist there.
export async function PUT(request: NextRequest) {
  const authz = await requirePlatformAdminApi(request.headers);
  if ('response' in authz) return authz.response;
  const { admin } = authz;

  let body: { key?: unknown; value?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const validation = validateSetting(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const auditBase = {
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: 'settings.update' as const,
    entityType: 'platform_setting',
    entityId: validation.dbKey,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
  };

  try {
    await savePlatformSetting(validation.dbKey, validation.value, admin.id);
    await recordAuditLog({ ...auditBase, success: true, metadata: { value: validation.value } });
    return NextResponse.json({ ok: true, key: validation.dbKey, value: validation.value });
  } catch (error) {
    await recordAuditLog({ ...auditBase, success: false, metadata: { error: 'exception' } });
    console.error('[admin] settings update failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to save the setting.' }, { status: 500 });
  }
}
