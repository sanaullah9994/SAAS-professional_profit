import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { saveCogsRow } from '../route';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  const text = await file.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as any[];
  for (const r of rows) {
    await saveCogsRow(
      {
        sku: r.sku, effectiveFrom: r.effective_from, unitCogs: Number(r.unit_cogs),
        inboundFreightPerUnit: Number(r.inbound_freight_per_unit ?? 0),
        customsPerUnit: Number(r.customs_per_unit ?? 0),
        prepFeePerUnit: Number(r.prep_fee_per_unit ?? 0),
      },
    );
  }
  return NextResponse.json({ imported: rows.length });
}
