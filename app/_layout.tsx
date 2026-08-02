import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { fontAssets, fonts } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { clearGuestSession, ensureCloudAccountSession } from '@/lib/storage';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [authReady, setAuthReady] = useState(!supabaseEnabled);

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  // Keep registered session across screens; restore from Supabase Auth storage
  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setAuthReady(true);
      return;
    }

    const client = supabase;
    let cancelled = false;

    const syncSession = () => {
      setTimeout(async () => {
        try {
          const { data } = await client.auth.getSession();
          if (cancelled) return;
          if (data.session?.user) {
            clearGuestSession();
            await ensureCloudAccountSession();
          }
        } finally {
          if (!cancelled) setAuthReady(true);
        }
      }, 0);
    };

    syncSession();

    const { data: sub } = client.auth.onAuthStateChange((event) => {
      setTimeout(async () => {
        if (cancelled) return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          clearGuestSession();
          await ensureCloudAccountSession();
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!fontsLoaded || !authReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: fonts.bold, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'SafeBite', headerStyle: { backgroundColor: colors.primaryDark } }} />
        <Stack.Screen name="language" options={{ title: 'Language' }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset" options={{ title: 'Password' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
