import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { passwordRequirementError } from '@/lib/password-rules';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const newPassword = body?.newPassword;
  const error = passwordRequirementError(newPassword);
  if (error) return NextResponse.json({ message: error }, { status: 400 });

  try {
    await auth.api.setPassword({ body: { newPassword }, headers: req.headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not set password';
    return NextResponse.json({ message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
