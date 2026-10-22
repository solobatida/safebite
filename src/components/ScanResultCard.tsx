import { View, Text, Image, StyleSheet } from 'react-native';
import type { ScanResult, UiLanguage } from '@/types';
import { t } from '@/i18n/translations';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

const safeFace = require('../../assets/images/result-safe.png');
const unsafeFace = require('../../assets/images/result-unsafe.png');
const confetti = require('../../assets/images/result-confetti.png');

export function ScanResultCard({ result, lang }: { result: ScanResult; lang: UiLanguage }) {
  const inconclusive = Boolean(result.unknownReason);
  const ok = result.safe && !inconclusive;
  const count = result.matched.length;
  const ingredientsPreview = result.ingredientsText?.trim().slice(0, 220);

  const detail = (() => {
    if (result.unknownReason === 'no_avoid_list') return t(lang, 'resultNoAvoidList');
    if (result.unknownReason === 'no_ingredients') return t(lang, 'resultNoIngredients');
    if (result.unknownReason === 'product_not_found') return t(lang, 'resultProductNotFound');
    if (ok) return t(lang, 'resultSafeDetail');
    return t(lang, 'resultNotSafeDetail', { count: String(count) });
  })();

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        {!inconclusive ? (
          <Image source={confetti} style={styles.confetti} resizeMode="contain" />
        ) : null}
        <Image
          source={ok ? safeFace : unsafeFace}
          style={styles.face}
          accessibilityLabel={ok ? t(lang, 'resultSafe') : t(lang, 'resultNotSafe')}
        />
      </View>

      <Text style={styles.productName}>{result.productName}</Text>
      {!inconclusive ? <Text style={styles.productIs}>{t(lang, 'resultProductIs')}</Text> : null}
      <Text
        style={[
          styles.verdict,
          ok ? styles.safeText : inconclusive ? styles.warnText : styles.dangerText,
        ]}
      >
        {inconclusive ? '?' : ok ? t(lang, 'resultSafe') : t(lang, 'resultNotSafe')}
      </Text>
      <Text style={styles.detail}>{detail}</Text>

      {!ok && result.matched.length > 0 && (
        <View style={styles.matchedBox}>
          {result.matched.map((m) => (
            <Text key={m.id} style={styles.matchedItem}>
              {m.label}
            </Text>
          ))}
        </View>
      )}

      {ingredientsPreview ? (
        <View style={styles.ingredientsBox}>
          <Text style={styles.ingredientsLabel}>{t(lang, 'resultIngredientsLabel')}</Text>
          <Text style={styles.ingredientsText}>
            {ingredientsPreview}
            {result.ingredientsText.trim().length > 220 ? '…' : ''}
          </Text>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>{t(lang, 'disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  hero: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  confetti: {
    position: 'absolute',
    width: '100%',
    height: 88,
    top: 4,
  },
  face: {
    width: 84,
    height: 84,
    zIndex: 1,
  },
  productName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  productIs: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
  },
  verdict: {
    fontSize: 28,
    fontFamily: fonts.extrabold,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  safeText: { color: '#1FA855' },
  dangerText: { color: '#E53935' },
  warnText: { color: '#C47F00' },
  detail: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  matchedBox: {
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  matchedItem: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 6,
  },
  ingredientsBox: {
    marginTop: spacing.md,
    width: '100%',
    backgroundColor: '#F4F7F5',
    borderRadius: 12,
    padding: spacing.md,
  },
  ingredientsLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 17,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 15,
  },
});
