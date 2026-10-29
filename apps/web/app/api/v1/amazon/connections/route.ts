import { NextRequest, NextResponse } from 'next/server';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  const rows = (await listTable('amazon_accounts', w)) as Record<string, unknown>[];
  // Strip stored credentials before the rows reach the browser.
  const safe = rows.map((row) => {
    const { sp_refresh_token_encrypted: _sp, ads_refresh_token_encrypted: _ads, ...rest } = row;
    return rest;
  });
  return NextResponse.json(safe);
}
