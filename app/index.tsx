import { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShelfBackground } from '@/components/ShelfBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, isGuestSession } from '@/lib/storage';
import { t } from '@/i18n/translations';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';
import type { UiLanguage } from '@/types';

const welcomeLogo = require('../assets/images/welcome-logo.png');
const LOGO_SIZE = 188;
/** Welcome is before language pick — Spanish default matches primary audience. */
const DEFAULT_LANG: UiLanguage = 'es';

export default function WelcomeScreen() {
  const router = useRouter();
  const lang = DEFAULT_LANG;

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session && !isGuestSession(session)) {
        router.replace('/preferences');
      }
    })();
  }, [router]);

  return (
    <ShelfBackground
      logo={
        <Image
          source={welcomeLogo}
          style={styles.logo}
          accessibilityLabel="SafeBite"
        />
      }
    >
      <Text style={styles.title}>SafeBite</Text>
      <Text style={styles.slogan}>{t(lang, 'slogan')}</Text>
      <Text style={styles.sub}>{t(lang, 'welcomeSub')}</Text>
      <View style={styles.actions}>
        <PrimaryButton
          label={t(lang, 'loginOrRegister')}
          onPress={() => router.push('/login')}
        />
        <PrimaryButton
          label={t(lang, 'enterAsGuest')}
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
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  title: {
    fontSize: 36,
    fontFamily: fonts.extrabold,
    color: '#1B633E',
    textAlign: 'center',
  },
  slogan: {
    fontSize: 17,
    fontFamily: fonts.bold,
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
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  actions: { marginTop: spacing.xl, width: '100%' },
});
