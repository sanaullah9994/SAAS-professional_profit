import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { query } from '@amazon-profit/db';
import { auth } from './auth.js';
import { passwordRequirementError } from './auth-hooks.service.js';

@Controller('v1/auth')
export class AuthExtraController {
  // Used by the signup / forgot-password forms to show provider-specific messaging
  // ("this email already uses Google Sign-In") before hitting better-auth's own endpoints.
  @Get('check-email')
  @OptionalAuth()
  async checkEmail(@Query('email') email?: string) {
    if (!email) return { exists: false, providers: [] };
    const normalized = email.trim().toLowerCase();
    const { rows } = await query<{ provider_id: string }>(
      `SELECT aa.provider_id FROM users u JOIN auth_accounts aa ON aa.user_id = u.id WHERE lower(u.email) = $1`,
      [normalized],
    );
    if (rows.length === 0) return { exists: false, providers: [] };
    return { exists: true, providers: [...new Set(rows.map((r) => r.provider_id))] };
  }

  // "Create Password" flow for a Google-only user: setPassword is server-only in better-auth
  // (never exposed to authClient), so this authenticated route is the bridge from Settings.
  // No @OptionalAuth()/@AllowAnonymous() — the global AuthGuard requires a session by default.
  @Post('set-password')
  async setPassword(@Body('newPassword') newPassword: string, @Req() req: Request) {
    const error = passwordRequirementError(newPassword);
    if (error) throw new HttpException(error, HttpStatus.BAD_REQUEST);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }

    try {
      await auth.api.setPassword({ body: { newPassword }, headers });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not set password';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
    return { ok: true };
  }
}
