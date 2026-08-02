import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { clearGuestSession, ensureCloudAccountSession } from '@/lib/storage';
import type { UserSession } from '@/types';

WebBrowser.maybeCompleteAuthSession();

export function getAuthRedirectUrl(path = 'auth/callback'): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/${path}`;
  }
  return Linking.createURL(path);
}

function tokensFromUrl(url: string): {
  access_token?: string;
  refresh_token?: string;
  code?: string;
} {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};
  let access_token = typeof query.access_token === 'string' ? query.access_token : undefined;
  let refresh_token = typeof query.refresh_token === 'string' ? query.refresh_token : undefined;
  const code = typeof query.code === 'string' ? query.code : undefined;

  if ((!access_token || !refresh_token) && url.includes('#')) {
    const hash = url.split('#')[1] ?? '';
    const hashParams = Object.fromEntries(new URLSearchParams(hash));
    access_token = access_token ?? hashParams.access_token;
    refresh_token = refresh_token ?? hashParams.refresh_token;
  }

  return { access_token, refresh_token, code };
}

export async function establishSessionFromRedirectUrl(url: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');

  const { access_token, refresh_token, code } = tokensFromUrl(url);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }

  throw new Error('No se recibieron tokens de Google. Revisa Redirect URLs en Supabase.');
}

export async function signInWithGoogle(): Promise<UserSession | null> {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const redirectTo = getAuthRedirectUrl();

  // Web: full-page redirect; session is finished on /auth/callback
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No se pudo abrir Google Login.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error('Inicio de sesión con Google cancelado.');
  }

  await establishSessionFromRedirectUrl(result.url);
  clearGuestSession();
  const session = await ensureCloudAccountSession();
  if (!session) throw new Error('No se pudo crear la sesión de SafeBite.');
  return session;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase no está configurado.');
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new Error('Introduce un email válido.');
  }

  const redirectTo = getAuthRedirectUrl('auth/reset');
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
  if (error) throw error;
}
