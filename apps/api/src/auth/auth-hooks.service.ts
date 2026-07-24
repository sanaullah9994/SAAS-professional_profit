import { Injectable } from '@nestjs/common';
import { BeforeHook, Hook, type AuthHookContext } from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';

const SPECIAL_CHAR = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export function passwordRequirementError(password: unknown): string | null {
  if (typeof password !== 'string') return null;
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!SPECIAL_CHAR.test(password)) return 'Password must include a special character.';
  return null;
}

function assertPassword(ctx: AuthHookContext, field: string) {
  const body = ctx.body as Record<string, unknown> | undefined;
  const error = passwordRequirementError(body?.[field]);
  if (error) throw new APIError('BAD_REQUEST', { message: error, code: 'PASSWORD_TOO_WEAK' });
}

// better-auth's own emailAndPassword.minPasswordLength/maxPasswordLength only check length —
// this enforces the character-class rules (upper/lower/number/special) shown live on the signup
// and reset-password forms, mirrored here so the API is never a weaker gate than the UI.
@Hook()
@Injectable()
export class AuthHooksService {
  @BeforeHook('/sign-up/email')
  async onSignUp(ctx: AuthHookContext) {
    assertPassword(ctx, 'password');
  }

  @BeforeHook('/reset-password')
  async onResetPassword(ctx: AuthHookContext) {
    assertPassword(ctx, 'newPassword');
  }

  @BeforeHook('/change-password')
  async onChangePassword(ctx: AuthHookContext) {
    assertPassword(ctx, 'newPassword');
  }
}
