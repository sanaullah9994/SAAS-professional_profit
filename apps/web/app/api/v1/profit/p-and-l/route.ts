import { NextRequest, NextResponse } from 'next/server';
import { getOverview, getProfitTrend } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  const d = Number(req.nextUrl.searchParams.get('days')) || 30;
  return NextResponse.json({ summary: await getOverview(w, d), trend: await getProfitTrend(w, d) });
}
