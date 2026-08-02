import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScanResult, UiLanguage } from '@/types';
import { t } from '@/i18n/translations';
import { colors, spacing } from '@/constants/theme';

export function ScanResultCard({ result, lang }: { result: ScanResult; lang: UiLanguage }) {
  const ok = result.safe;

  return (
    <View style={[styles.card, ok ? styles.safeCard : styles.dangerCard]}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'close-circle'}
        size={56}
        color={ok ? colors.safe : colors.danger}
      />
      <Text style={styles.productName}>{result.productName}</Text>
      <Text style={[styles.verdict, ok ? styles.safeText : styles.dangerText]}>
        {ok ? t(lang, 'safe') : t(lang, 'notSafe')}
      </Text>
      {!ok && result.matched.length > 0 && (
        <View style={styles.matchedBox}>
          {result.matched.map((m) => (
            <Text key={m.id} style={styles.matchedItem}>
              {m.label}
            </Text>
          ))}
        </View>
      )}
      <Text style={styles.disclaimer}>{t(lang, 'disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  safeCard: { backgroundColor: colors.safeBg },
  dangerCard: { backgroundColor: colors.dangerBg },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  verdict: { fontSize: 18, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  safeText: { color: colors.safe },
  dangerText: { color: colors.danger },
  matchedBox: {
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  matchedItem: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
