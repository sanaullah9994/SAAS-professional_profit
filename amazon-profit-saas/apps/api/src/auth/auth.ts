import { betterAuth } from 'better-auth';
import { pool } from '@amazon-profit/db';
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET ?? 'development-only-secret-change-this-now',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),
  database: pool,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user:{modelName:'users',fields:{emailVerified:'email_verified',createdAt:'created_at',updatedAt:'updated_at'}},
  session:{modelName:'user_sessions',fields:{expiresAt:'expires_at',createdAt:'created_at',updatedAt:'updated_at',ipAddress:'ip_address',userAgent:'user_agent',userId:'user_id'}},
  account:{modelName:'auth_accounts',fields:{accountId:'account_id',providerId:'provider_id',userId:'user_id',accessToken:'access_token',refreshToken:'refresh_token',idToken:'id_token',accessTokenExpiresAt:'access_token_expires_at',refreshTokenExpiresAt:'refresh_token_expires_at',createdAt:'created_at',updatedAt:'updated_at'}},
  verification:{modelName:'auth_verifications',fields:{expiresAt:'expires_at',createdAt:'created_at',updatedAt:'updated_at'}}
});
