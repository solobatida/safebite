import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShelfBackground } from '@/components/ShelfBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, isGuestSession } from '@/lib/storage';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session && !isGuestSession(session)) {
        router.replace('/preferences');
      }
    })();
  }, [router]);

  return (
    <ShelfBackground>
      <Text style={styles.logo}>SafeBite</Text>
      <Text style={styles.slogan}>Scan. Smile. Bite.</Text>
      <Text style={styles.sub}>
        Scan barcodes in the supermarket and check ingredients in your language.
      </Text>
      <View style={styles.actions}>
        <PrimaryButton
          label="Login / Regístrate"
          onPress={() => router.push('/login')}
        />
        <PrimaryButton
          label="Entra como amigo"
          variant="secondary"
          onPress={() => router.push('/language?mode=guest')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </ShelfBackground>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 42,
    fontFamily: fonts.extrabold,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 18,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
  actions: { marginTop: spacing.xl, width: '100%' },
});
