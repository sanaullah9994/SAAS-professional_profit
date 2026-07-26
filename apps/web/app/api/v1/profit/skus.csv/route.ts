import { NextRequest } from 'next/server';
import { getSkuProfitability } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

const KEYS = ['sku', 'asin', 'title', 'units', 'revenue', 'amazonFees', 'adSpend', 'cogs', 'refunds', 'netProfit', 'marginPercent'] as const;
const cell = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const rows = await getSkuProfitability(w, 30);
  const csv = [KEYS.join(','), ...rows.map((r) => KEYS.map((k) => cell((r as any)[k])).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="sku-profitability.csv"',
    },
  });
}
