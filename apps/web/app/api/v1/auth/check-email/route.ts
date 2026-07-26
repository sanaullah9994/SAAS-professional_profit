import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ exists: false, providers: [] });
  const normalized = email.trim().toLowerCase();
  const { rows } = await query<{ provider_id: string }>(
    `SELECT aa.provider_id FROM users u JOIN auth_accounts aa ON aa.user_id = u.id WHERE lower(u.email) = $1`,
    [normalized],
  );
  if (rows.length === 0) return NextResponse.json({ exists: false, providers: [] });
  return NextResponse.json({ exists: true, providers: [...new Set(rows.map((r) => r.provider_id))] });
}
