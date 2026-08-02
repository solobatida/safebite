import type { AuthError } from '@supabase/supabase-js';
import type { UiLanguage } from '@/types';
import { t } from '@/i18n/translations';

function readErrorField(e: unknown, field: 'message' | 'code' | 'status'): string | number | undefined {
  if (typeof e !== 'object' || e === null) return undefined;
  const value = (e as Record<string, unknown>)[field];
  if (field === 'status' && typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return undefined;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  const msg = readErrorField(e, 'message');
  return typeof msg === 'string' ? msg : '';
}

function errorCode(e: unknown): string {
  const code = readErrorField(e, 'code');
  return typeof code === 'string' ? code : '';
}

export function getAuthErrorMessage(e: unknown, lang: UiLanguage = 'es'): string {
  const code = errorCode(e);
  const msg = errorMessage(e).toLowerCase();

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return t(lang, 'authEmailNotConfirmed');
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return t(lang, 'authInvalidCredentials');
  }
  if (code === 'user_already_registered') {
    return t(lang, 'authUserExists');
  }

  const readable = errorMessage(e);
  if (readable) return readable;
  return t(lang, 'authGeneric');
}

export function isEmailNotConfirmedError(e: unknown): boolean {
  const code = errorCode(e);
  if (code === 'email_not_confirmed') return true;
  return errorMessage(e).toLowerCase().includes('email not confirmed');
}

export type { AuthError };
