import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { createGuestSession } from '@/lib/storage';
import { LANGUAGES } from '@/constants/languages';
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
      <Text style={styles.title}>Elige tu idioma</Text>
      <Text style={styles.sub}>
        {isGuest
          ? 'Modo amigo: puedes usar la app, pero al cerrarla no se guardan los datos.'
          : 'Idioma de la interfaz para menús y resultados.'}
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
      <PrimaryButton label="Continuar" onPress={continueFlow} style={{ marginTop: spacing.lg }} />
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
