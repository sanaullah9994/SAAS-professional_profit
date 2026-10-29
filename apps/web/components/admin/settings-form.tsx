'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@amazon-profit/ui';
import type { SettingDefinition } from '@/lib/admin-settings';

type Values = Record<string, string | boolean | number>;

export function SettingsForm({
  definitions,
  values,
}: {
  definitions: Pick<SettingDefinition, 'dbKey' | 'label' | 'description' | 'type' | 'min' | 'max'>[];
  values: Values;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Values>(values);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = (dbKey: string) => String(draft[dbKey] ?? '') !== String(values[dbKey] ?? '');

  const save = async (dbKey: string, type: 'boolean' | 'integer') => {
    setBusyKey(dbKey);
    setErrors((prev) => ({ ...prev, [dbKey]: '' }));
    setNotice(null);
    try {
      const raw = draft[dbKey];
      const payload = type === 'boolean' ? Boolean(raw) : Number(raw);
      const response = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: dbKey, value: payload }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; value?: unknown } | null;
      if (!response.ok) {
        setErrors((prev) => ({ ...prev, [dbKey]: body?.error ?? `Save failed (HTTP ${response.status}).` }));
        return;
      }
      setNotice(`${dbKey} saved.`);
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, [dbKey]: 'Save failed. Please try again.' }));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p role="status" className="text-sm font-medium text-primary">
          {notice}
        </p>
      ) : null}
      {definitions.map((definition) => {
        const current = draft[definition.dbKey];
        return (
          <div key={definition.dbKey} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold">{definition.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5">{definition.dbKey}</code>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {definition.type === 'boolean' ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={current === true}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [definition.dbKey]: event.target.checked }))}
                      className="size-4 rounded border-input accent-[var(--primary)]"
                    />
                    {current === true ? 'Enabled' : 'Disabled'}
                  </label>
                ) : (
                  <input
                    type="number"
                    min={definition.min}
                    max={definition.max}
                    value={typeof current === 'string' ? current : String(current ?? '')}
                    onChange={(event) => setDraft((prev) => ({ ...prev, [definition.dbKey]: event.target.value }))}
                    aria-label={definition.label}
                    className="flex h-10 w-24 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
                <Button size="sm" disabled={busyKey === definition.dbKey || !dirty(definition.dbKey)} onClick={() => save(definition.dbKey, definition.type)}>
                  {busyKey === definition.dbKey ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
            {errors[definition.dbKey] ? (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {errors[definition.dbKey]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
