import { NextRequest, NextResponse } from 'next/server';
import { listTable, query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  return NextResponse.json(await listTable('cogs_history', w));
}

export type CogsRowInput = {
  sku: string; effectiveFrom: string; effectiveTo?: string | null; unitCogs: number;
  inboundFreightPerUnit?: number; customsPerUnit?: number; prepFeePerUnit?: number; notes?: string | null;
};

export async function saveCogsRow(b: CogsRowInput) {
  const w = await workspaceId();
  const { rows } = await query(
    `INSERT INTO cogs_history(workspace_id,sku,effective_from,effective_to,unit_cogs,inbound_freight_per_unit,customs_per_unit,prep_fee_per_unit,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(workspace_id,sku,effective_from) DO UPDATE SET effective_to=excluded.effective_to,unit_cogs=excluded.unit_cogs,inbound_freight_per_unit=excluded.inbound_freight_per_unit,customs_per_unit=excluded.customs_per_unit,prep_fee_per_unit=excluded.prep_fee_per_unit,notes=excluded.notes,updated_at=now() RETURNING *`,
    [w, b.sku, b.effectiveFrom, b.effectiveTo ?? null, b.unitCogs, b.inboundFreightPerUnit ?? 0, b.customsPerUnit ?? 0, b.prepFeePerUnit ?? 0, b.notes ?? null],
  );
  return rows[0];
}

export async function POST(req: NextRequest) {
  const b = (await req.json()) as CogsRowInput;
  return NextResponse.json(await saveCogsRow(b));
}
