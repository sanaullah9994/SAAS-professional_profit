import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceDaily, getPerformanceMonthly, getSkuCodes } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  const days = Number(req.nextUrl.searchParams.get('days')) || 90;
  const code = req.nextUrl.searchParams.get('code') ?? undefined;
  const [daily, monthly, codes] = await Promise.all([
    getPerformanceDaily(w, days, code),
    getPerformanceMonthly(w, code),
    getSkuCodes(w),
  ]);
  return NextResponse.json({ daily, monthly, codes });
}
