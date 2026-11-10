import { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { searchIngredients, getDisplayLabel } from '@/lib/ingredients';
import { t } from '@/i18n/translations';
import type { Ingredient, UiLanguage } from '@/types';
import { colors, spacing } from '@/constants/theme';
import { fonts } from '@/constants/fonts';

export function IngredientSearch({
  lang,
  onSelect,
  placeholder,
  excludeIds = [],
  onAddCustom,
}: {
  lang: UiLanguage;
  onSelect: (ing: Ingredient) => void;
  placeholder: string;
  /** Ingredient ids already on the avoid list — shown as disabled */
  excludeIds?: string[];
  /** Opens the custom-ingredient flow */
  onAddCustom?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const excluded = new Set(excludeIds);

  useEffect(() => {
    setQuery('');
    setSuggestions([]);
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const results = await searchIngredients(query, 20, lang);
      if (!cancelled) setSuggestions(results);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [query, lang]);

  const pick = (ing: Ingredient) => {
    if (excluded.has(ing.id)) return;
    onSelect(ing);
    setQuery('');
    setSuggestions([]);
  };

  const addFromQuery = () => {
    const firstAvailable = suggestions.find((ing) => !excluded.has(ing.id));
    if (firstAvailable) pick(firstAvailable);
  };

  return (
    <View key={lang}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={addFromQuery}
        blurOnSubmit={false}
      />
      {query.length > 0 && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item) => {
            const already = excluded.has(item.id);
            return (
              <Pressable
                key={`${lang}-${item.id}`}
                style={[styles.suggestion, already && styles.suggestionDisabled]}
                onPress={() => pick(item)}
                disabled={already}
              >
                <View style={styles.suggestionMain}>
                  <Text
                    style={[styles.suggestionText, already && styles.suggestionTextDisabled]}
                  >
                    {getDisplayLabel(item, lang)}
                  </Text>
                  {already ? (
                    <Text style={styles.alreadyHint}>{t(lang, 'ingredientAlreadyAdded')}</Text>
                  ) : null}
                </View>
                <Text style={styles.category}>{item.category}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {onAddCustom ? (
        <Text style={styles.addLinkText}>
          {t(lang, 'addIngredientLink')}
          <Text style={styles.addLink} onPress={onAddCustom}>
            {t(lang, 'addIngredientLinkHere')}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

export function AvoidList({
  ids,
  lang,
  catalog,
  onRemove,
}: {
  ids: string[];
  lang: UiLanguage;
  catalog: Ingredient[];
  onRemove: (id: string) => void;
}) {
  if (ids.length === 0) {
    return <Text style={styles.empty}>{t(lang, 'avoidListEmpty')}</Text>;
  }

  const rows = ids.map((id) => {
    const item = catalog.find((c) => c.id === id);
    const label = item
      ? getDisplayLabel(item, lang)
      : id.replace(/^custom-/, '').replace(/-/g, ' ');
    return { id, label };
  });
  rows.sort((a, b) => a.label.localeCompare(b.label, lang));

  return (
    <View style={styles.list}>
      {rows.map(({ id, label }) => (
        <View key={id} style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
          <Pressable onPress={() => onRemove(id)} hitSlop={8}>
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionDisabled: {
    opacity: 0.55,
    backgroundColor: colors.background,
  },
  suggestionMain: { flex: 1 },
  suggestionText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  suggestionTextDisabled: { color: colors.textMuted },
  alreadyHint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  category: { fontSize: 12, color: colors.textMuted },
  addLinkText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 20,
  },
  addLink: {
    color: colors.primary,
    fontFamily: fonts.semibold,
    textDecorationLine: 'underline',
  },
  list: { marginTop: spacing.md },
  empty: { color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 16, flex: 1 },
  remove: { fontSize: 18, color: colors.danger, paddingLeft: 12 },
});
