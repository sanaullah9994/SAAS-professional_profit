import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const days = Number(req.nextUrl.searchParams.get('days')) || 30;
  const { rows } = await query<any>(
    `SELECT COALESCE(SUM(a.spend),0) spend,COALESCE(SUM(a.attributed_sales),0) sales,COALESCE(SUM(a.impressions),0) impressions,COALESCE(SUM(a.clicks),0) clicks,COALESCE(SUM(a.attributed_orders),0) orders,COALESCE(SUM(a.spend) FILTER(WHERE a.product_id IS NULL),0) unattributed FROM ad_spend_daily a JOIN amazon_accounts aa ON aa.id=a.amazon_account_id WHERE aa.workspace_id=$1 AND a.date>=current_date-($2::int-1)`,
    [w, days],
  );
  const r = rows[0] ?? {};
  const spend = Number(r.spend), sales = Number(r.sales), clicks = Number(r.clicks), impressions = Number(r.impressions);
  return NextResponse.json({
    spend, sales, acosPercent: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0,
    clicks, impressions, ctrPercent: impressions ? (clicks / impressions) * 100 : 0, cpc: clicks ? spend / clicks : 0,
    orders: Number(r.orders), unattributedSpend: Number(r.unattributed),
  });
}
