import { NextRequest, NextResponse } from 'next/server';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  return NextResponse.json(await listTable('alerts', w));
}
