import { NextRequest, NextResponse } from 'next/server';
import { getOverview, getProfitTrend, getExpenseBreakdown, getSkuProfitability } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const [summary, trend, expenses, products] = await Promise.all([
    getOverview(w, d), getProfitTrend(w, d), getExpenseBreakdown(w, d), getSkuProfitability(w, d),
  ]);
  return NextResponse.json({ summary, trend, expenses, products, period: d });
}
