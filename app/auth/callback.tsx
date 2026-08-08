import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { establishSessionFromRedirectUrl } from '@/lib/auth';
import { clearGuestSession, ensureCloudAccountSession } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

/** Deep-link / web landing after Google OAuth */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let url: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          url = window.location.href;
        } else {
          url = await Linking.getInitialURL();
        }

        if (url && (url.includes('code=') || url.includes('access_token='))) {
          await establishSessionFromRedirectUrl(url);
        } else if (supabase) {
          // detectSessionInUrl may have cleaned the query already
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error(
              'No hay sesión tras Google Login. Revisa Redirect URLs en Supabase (localhost:8081/auth/callback).'
            );
          }
        }

        clearGuestSession();
        const session = await ensureCloudAccountSession();
        if (!session) {
          throw new Error(
            'No hay sesión tras Google Login. Revisa Redirect URLs en Supabase (localhost:8081/auth/callback).'
          );
        }

        // Clean OAuth params from the address bar on web
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/preferences');
        }

        if (!cancelled) router.replace('/preferences');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al completar el login');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.wrap}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Entrando…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.loginBg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  text: { fontFamily: fonts.semibold, color: colors.textMuted },
  error: { fontFamily: fonts.regular, color: colors.danger, textAlign: 'center' },
});
