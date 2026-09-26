import { NextRequest, NextResponse } from 'next/server';
import { getInventory } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = await workspaceId();
  return NextResponse.json(await getInventory(w));
}
