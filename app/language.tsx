import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { createGuestSession } from '@/lib/storage';
import { LANGUAGES } from '@/constants/languages';
import { t } from '@/i18n/translations';
import type { UiLanguage } from '@/types';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

export default function LanguageScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isGuest = mode === 'guest';
  const [selected, setSelected] = useState<UiLanguage>('es');

  const continueFlow = async () => {
    if (isGuest) {
      await createGuestSession(selected);
      router.replace('/preferences');
      return;
    }
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t(selected, 'navLanguage') }} />
      <Text style={styles.title}>{t(selected, 'languageTitle')}</Text>
      <Text style={styles.sub}>
        {isGuest ? t(selected, 'languageGuestHint') : t(selected, 'languageHint')}
      </Text>
      <View style={styles.langGrid}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.langChip, selected === l.code && styles.langChipSelected]}
            onPress={() => setSelected(l.code)}
          >
            <Text
              style={[styles.langChipText, selected === l.code && styles.langChipTextSelected]}
            >
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        label={t(selected, 'continue')}
        onPress={continueFlow}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.loginBg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0E6E2',
  },
  langChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5EE',
  },
  langChipText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  langChipTextSelected: {
    color: colors.primaryDark,
  },
});
