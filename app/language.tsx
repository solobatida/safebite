import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getSession, setSession, updateUiLanguage, registerLocalUser } from '@/lib/storage';
import type { UiLanguage } from '@/types';
import { colors, spacing } from '@/constants/theme';

const LANGUAGES: { code: UiLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<UiLanguage>('en');

  const continueFlow = async () => {
    let session = await getSession();
    if (!session) {
      session = await registerLocalUser('guest@safebite.local', 'guestpass8', 'Guest', selected);
    } else {
      await updateUiLanguage(selected);
      session = { ...session, uiLanguage: selected };
      await setSession(session);
    }
    router.replace('/preferences');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your language</Text>
      <Text style={styles.sub}>UI language for menus and results.</Text>
      {LANGUAGES.map((l) => (
        <Pressable
          key={l.code}
          style={[styles.row, selected === l.code && styles.rowSelected]}
          onPress={() => setSelected(l.code)}
        >
          <Text style={styles.rowText}>{l.label}</Text>
        </Pressable>
      ))}
      <PrimaryButton label="Continue" onPress={continueFlow} style={{ marginTop: spacing.lg }} />
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
