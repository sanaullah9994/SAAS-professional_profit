import { NextRequest, NextResponse } from 'next/server';
import { getProductEconomics } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  const d = Number(req.nextUrl.searchParams.get('days')) || 30;
  return NextResponse.json(await getProductEconomics(w, d));
}
