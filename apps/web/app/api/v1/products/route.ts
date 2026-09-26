import { NextRequest, NextResponse } from 'next/server';
import { getProducts, setProductActive } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  return NextResponse.json(await getProducts(w));
}

export async function POST(req: NextRequest) {
  const b = (await req.json()) as { id: string; active: boolean };
  await setProductActive(b.id, b.active);
  return NextResponse.json({ ok: true });
}
