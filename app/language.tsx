import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { createGuestSession } from '@/lib/storage';
import { LANGUAGES } from '@/constants/languages';
import { t } from '@/i18n/translations';
import type { UiLanguage } from '@/types';
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
      {LANGUAGES.map((l) => (
        <Pressable
          key={l.code}
          style={[styles.row, selected === l.code && styles.rowSelected]}
          onPress={() => setSelected(l.code)}
        >
          <Text style={styles.rowText}>{l.label}</Text>
        </Pressable>
      ))}
      <PrimaryButton
        label={t(selected, 'continue')}
        onPress={continueFlow}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing.md },
  row: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: colors.primary },
  rowText: { fontSize: 17 },
});
