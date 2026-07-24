import { betterAuth } from 'better-auth';
import { pool } from '@amazon-profit/db';

export const auth = betterAuth({
  baseURL: {
    allowedHosts: ['localhost:4000', '127.0.0.1:4000', 'profitspiloted.netlify.app'],
    fallback: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  },
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET ?? 'development-only-secret-change-this-now',
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),

  database: pool,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // No SMTP wired yet — links are logged instead of emailed. Flip REQUIRE_EMAIL_VERIFICATION
    // once sendResetPassword/sendVerificationEmail below actually deliver mail, otherwise every
    // new signup would be permanently locked out with no way to receive the verification link.
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    resetPasswordTokenExpiresIn: 60 * 30, // 30 minutes
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      // TODO: wire real SMTP/Resend here. Logged for local testing in the meantime.
      console.log(`[auth] password reset link for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
    async sendVerificationEmail({ user, url }) {
      // TODO: wire real SMTP/Resend here. Logged for local testing in the meantime.
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
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  session: {
    modelName: 'user_sessions',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      userId: 'user_id',
    },
  },

  account: {
    modelName: 'auth_accounts',
    accountLinking: {
      enabled: true,
      // Google verifies its own emails, so linking an existing password account by matching
      // email is safe even before that account has completed our own email verification.
      trustedProviders: ['google'],
    },
    fields: {
      accountId: 'account_id',
      providerId: 'provider_id',
      userId: 'user_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  verification: {
    modelName: 'auth_verifications',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
});