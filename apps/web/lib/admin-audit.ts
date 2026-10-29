// Records security-sensitive administrative actions. Metadata is sanitized so
// passwords, tokens and other secrets can never land in the audit trail.
import { insertAuditLog } from '@amazon-profit/db';

export const ADMIN_AUDIT_ACTIONS = [
  'user.suspend',
  'user.reactivate',
  'sync.retry',
  'settings.update',
  'platform_owner.grant',
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

const SENSITIVE_KEY = /pass|token|secret|authorization|cookie|credential|refresh|password/i;
const METADATA_MAX_CHARS = 2_000;

export function sanitizeAuditMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = typeof value === 'string' ? value.slice(0, 500) : value;
    } else {
      // Objects/arrays are not stored: small scalar context is enough.
      continue;
    }
  }
  const serialized = JSON.stringify(clean);
  if (serialized.length > METADATA_MAX_CHARS) {
    return { truncated: true };
  }
  return clean;
}

export interface AuditEntry {
  actorUserId: string | null;
  actorEmail: string | null;
  action: AdminAuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await insertAuditLog({
      actorUserId: entry.actorUserId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      success: entry.success,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent?.slice(0, 300) ?? null,
      metadata: sanitizeAuditMetadata(entry.metadata),
    });
  } catch (error) {
    // An audit write failure must not mask the outcome of the action itself,
    // but it is loud enough to page an operator.
    console.error('[audit] failed to record', entry.action, error instanceof Error ? error.message : error);
  }
}
