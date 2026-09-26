import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  const w = await workspaceId();
  const a = process.env.MOCK_AMAZON_ACCOUNT_ID ?? '00000000-0000-0000-0000-000000000201';
  await query(
    `INSERT INTO amazon_accounts(id,workspace_id,seller_id,display_name,status,provider_mode,connected_at) VALUES($1,$2,'A1MOCKSELLER','Amazon.com — Mock','connected','mock',now()) ON CONFLICT(id) DO UPDATE SET status='connected',connected_at=now()`,
    [a, w],
  );
  return NextResponse.json({ id: a, status: 'connected', mode: 'mock' });
}
