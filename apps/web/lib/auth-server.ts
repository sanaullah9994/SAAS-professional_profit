import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { pool } from '@amazon-profit/db';
import { passwordRequirementError } from './password-rules';

function assertPassword(ctx: { path: string; body?: unknown }, field: string) {
  const body = ctx.body as Record<string, unknown> | undefined;
  const error = passwordRequirementError(body?.[field]);
  if (error) throw new APIError('BAD_REQUEST', { message: error, code: 'PASSWORD_TOO_WEAK' });
}

export const auth = betterAuth({
  baseURL: {
    allowedHosts: ['localhost:3000', '127.0.0.1:3000', 'profitspiloted.netlify.app'],
    fallback: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  },
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET ?? 'development-only-secret-change-this-now',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),

  database: pool,

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') assertPassword(ctx, 'password');
      else if (ctx.path === '/reset-password' || ctx.path === '/change-password') assertPassword(ctx, 'newPassword');
    }),
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    storage: 'database',
    modelName: 'rate_limits',
    fields: { lastRequest: 'last_request' },
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forgot-password': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      console.log(`[auth] password reset link for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    async sendVerificationEmail({ user, url }) {
      console.log(`[auth] verification link for ${user.email}: ${url}`);
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    modelName: 'users',
    fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
  },

  session: {
    modelName: 'user_sessions',
    fields: {
      expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at',
      ipAddress: 'ip_address', userAgent: 'user_agent', userId: 'user_id',
    },
  },

  account: {
    modelName: 'auth_accounts',
    accountLinking: { enabled: true, trustedProviders: ['google'] },
    fields: {
      accountId: 'account_id', providerId: 'provider_id', userId: 'user_id',
      accessToken: 'access_token', refreshToken: 'refresh_token', idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at', refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at', updatedAt: 'updated_at',
    },
  },

  verification: {
    modelName: 'auth_verifications',
    fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
  },

  plugins: [nextCookies()],
});
