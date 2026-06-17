import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShelfBackground } from '@/components/ShelfBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession } from '@/lib/storage';
import { colors, spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  const onEnter = async () => {
    const session = await getSession();
    if (session) {
      router.replace('/preferences');
    } else {
      router.push('/language');
    }
  };

  return (
    <ShelfBackground>
      <Text style={styles.logo}>SafeBite</Text>
      <Text style={styles.slogan}>Scan. Know. Eat safe.</Text>
      <Text style={styles.sub}>
        Scan barcodes in the supermarket and check ingredients in your language.
      </Text>
      <View style={styles.actions}>
        <PrimaryButton label="Enter" onPress={onEnter} />
        <PrimaryButton
          label="Login"
          variant="secondary"
          onPress={() => router.push('/login')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </ShelfBackground>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
  actions: { marginTop: spacing.xl, width: '100%' },
});
