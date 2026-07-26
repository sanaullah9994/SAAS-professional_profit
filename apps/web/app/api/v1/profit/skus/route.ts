import { NextRequest, NextResponse } from 'next/server';
import { getSkuProfitability } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Number(req.nextUrl.searchParams.get('days')) || 30;
  return NextResponse.json(await getSkuProfitability(w, d));
}
