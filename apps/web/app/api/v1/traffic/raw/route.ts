import { NextRequest, NextResponse } from 'next/server';
import { getTrafficRaw } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  const d = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  return NextResponse.json(await getTrafficRaw(w, d));
}
