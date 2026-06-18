import type { AuthError } from '@supabase/supabase-js';

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

export function getAuthErrorMessage(e: unknown): string {
  const code = errorCode(e);
  const msg = errorMessage(e).toLowerCase();

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Confirma tu email antes de entrar. Revisa la bandeja de entrada y la carpeta de spam.';
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (code === 'user_already_registered') {
    return 'Ya existe una cuenta con este email. Inicia sesión o confirma el email.';
  }

  const readable = errorMessage(e);
  if (readable) return readable;
  return 'Algo salió mal';
}

export function isEmailNotConfirmedError(e: unknown): boolean {
  const code = errorCode(e);
  if (code === 'email_not_confirmed') return true;
  return errorMessage(e).toLowerCase().includes('email not confirmed');
}

export type { AuthError };
