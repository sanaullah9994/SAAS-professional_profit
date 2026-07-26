import { NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';

export async function POST() {
  const a = process.env.MOCK_AMAZON_ACCOUNT_ID ?? '00000000-0000-0000-0000-000000000201';
  await query(
    `INSERT INTO amazon_ad_accounts(amazon_account_id,profile_id,display_name,status,connected_at) VALUES($1,'999999999999','Amazon Ads — Mock','connected',now())`,
    [a],
  );
  return NextResponse.json({ status: 'connected', mode: 'mock' });
}
