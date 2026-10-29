// Operator-only bootstrap: promotes an existing user to platform owner by
// writing users.platform_role = 'owner'. Requires DATABASE access (i.e. you
// are the operator running this on the server) — there is deliberately no web
// endpoint that can grant platform access.
//
// Usage:
//   pnpm --filter @amazon-profit/web admin:promote owner@example.com
//
// Alternative bootstrap without a DB write: set ADMIN_OWNER_EMAILS in the
// server environment (comma-separated emails) and sign in as that user.
import { query, pool } from '@amazon-profit/db';

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: pnpm --filter @amazon-profit/web admin:promote <email>');
    process.exit(1);
  }

  try {
    const { rows } = await query<{ id: string; email: string; platform_role: string }>(
      `UPDATE users SET platform_role = 'owner', updated_at = now()
        WHERE lower(email) = $1
        RETURNING id, email, platform_role`,
      [email],
    );
    const user = rows[0];
    if (!user) {
      console.error(`No user found with email ${email}. Ask them to sign up first, then re-run this script.`);
      process.exit(1);
    }
    await query(
      `INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'platform_owner.grant', 'user', $1, '{"source":"promote-script"}'::jsonb)`,
      [user.id, user.email],
    );
    console.log(`Promoted ${user.email} (id ${user.id}) to platform owner.`);
    console.log('They can now access /admin on their next request.');
  } catch (error) {
    console.error('Promotion failed:', error instanceof Error ? error.message : error);
    console.error('Is migration 0011_platform_admin.sql applied?');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
