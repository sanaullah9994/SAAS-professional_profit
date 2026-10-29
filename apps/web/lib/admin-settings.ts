// Platform settings with real server-side enforcement. Read/write helpers live
// here (not in admin-auth) so better-auth's signup hook can import them without
// a circular dependency on the auth instance.
import { getPlatformSettingRows, updatePlatformSetting } from '@amazon-profit/db';

export interface PlatformSettings {
  signupsEnabled: boolean;
  syncRetryEnabled: boolean;
  activeUserWindowDays: number;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  signupsEnabled: true,
  syncRetryEnabled: true,
  activeUserWindowDays: 30,
};

export interface SettingDefinition {
  key: keyof PlatformSettings;
  dbKey: string;
  label: string;
  description: string;
  type: 'boolean' | 'integer';
  min?: number;
  max?: number;
}

// Only settings with an actual server-side enforcement point belong here.
export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: 'signupsEnabled',
    dbKey: 'signups_enabled',
    label: 'Allow new sign-ups',
    description: 'When disabled, email/password and Google registration are rejected server-side. Existing users can still sign in.',
    type: 'boolean',
  },
  {
    key: 'syncRetryEnabled',
    dbKey: 'sync_retry_enabled',
    label: 'Allow admin sync retries',
    description: 'When disabled, the admin panel cannot trigger manual Amazon synchronization retries.',
    type: 'boolean',
  },
  {
    key: 'activeUserWindowDays',
    dbKey: 'active_user_window_days',
    label: 'Active users window (days)',
    description: 'Activity window used by the overview "active users" metric: users with at least one session started in this window.',
    type: 'integer',
    min: 1,
    max: 90,
  },
];

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 'false') return value === 'true';
  return fallback;
}

function coerceInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

// Returns validated settings; falls back to defaults when the table or a row is
// missing (e.g. migration 0011 not yet applied) so sign-in never breaks.
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  let rows: Awaited<ReturnType<typeof getPlatformSettingRows>>;
  try {
    rows = await getPlatformSettingRows();
  } catch (error) {
    console.error('[platform-settings] failed to read settings, using defaults:', error instanceof Error ? error.message : error);
    return settings;
  }
  for (const row of rows) {
    switch (row.key) {
      case 'signups_enabled':
        settings.signupsEnabled = coerceBoolean(row.value, DEFAULT_PLATFORM_SETTINGS.signupsEnabled);
        break;
      case 'sync_retry_enabled':
        settings.syncRetryEnabled = coerceBoolean(row.value, DEFAULT_PLATFORM_SETTINGS.syncRetryEnabled);
        break;
      case 'active_user_window_days':
        settings.activeUserWindowDays = coerceInteger(row.value, DEFAULT_PLATFORM_SETTINGS.activeUserWindowDays, 1, 90);
        break;
      default:
        break;
    }
  }
  return settings;
}

export type SettingValidation =
  | { ok: true; dbKey: string; value: boolean | number }
  | { ok: false; error: string };

// Validates a {key, value} pair from the admin settings API. Keys outside the
// allowlist are rejected outright.
export function validateSetting(input: { key?: unknown; value?: unknown }): SettingValidation {
  const definition = SETTING_DEFINITIONS.find((d) => d.dbKey === input.key);
  if (!definition) {
    return { ok: false, error: 'Unknown setting key.' };
  }
  if (definition.type === 'boolean') {
    if (typeof input.value !== 'boolean') {
      return { ok: false, error: `${definition.dbKey} must be true or false.` };
    }
    return { ok: true, dbKey: definition.dbKey, value: input.value };
  }
  const parsed = typeof input.value === 'string' ? Number(input.value) : input.value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { ok: false, error: `${definition.dbKey} must be an integer.` };
  }
  const min = definition.min ?? 1;
  const max = definition.max ?? 90;
  if (parsed < min || parsed > max) {
    return { ok: false, error: `${definition.dbKey} must be between ${min} and ${max}.` };
  }
  return { ok: true, dbKey: definition.dbKey, value: parsed };
}

export async function savePlatformSetting(dbKey: string, value: boolean | number, actorUserId: string | null): Promise<void> {
  await updatePlatformSetting(dbKey, value, actorUserId);
}
