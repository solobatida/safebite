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
}: {
  lang: UiLanguage;
  onSelect: (ing: Ingredient) => void;
  placeholder: string;
  /** Ingredient ids already on the avoid list — hidden from suggestions */
  excludeIds?: string[];
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
      const results = await searchIngredients(query, 12, lang);
      if (!cancelled) {
        setSuggestions(results.filter((ing) => !excluded.has(ing.id)));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [query, lang, excludeIds.join('|')]);

  const pick = (ing: Ingredient) => {
    onSelect(ing);
    setQuery('');
    setSuggestions([]);
  };

  const addFromQuery = () => {
    if (suggestions.length > 0) {
      pick(suggestions[0]);
      return;
    }
  };

  return (
    <View key={lang}>
      <View style={styles.row}>
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
        <Pressable
          style={[styles.addBtn, query.trim().length === 0 && styles.addBtnDisabled]}
          disabled={query.trim().length === 0 || suggestions.length === 0}
          onPress={addFromQuery}
          accessibilityRole="button"
          accessibilityLabel={t(lang, 'addIngredient')}
        >
          <Text style={styles.addBtnText}>{t(lang, 'add')}</Text>
        </Pressable>
      </View>
      {query.length > 0 && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item) => (
            <Pressable
              key={`${lang}-${item.id}`}
              style={styles.suggestion}
              onPress={() => pick(item)}
            >
              <Text style={styles.suggestionText}>{getDisplayLabel(item, lang)}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {query.trim().length >= 2 && suggestions.length === 0 ? (
        <Text style={styles.noMatch}>{t(lang, 'addIngredientLink')}</Text>
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

  return (
    <View style={styles.list}>
      {ids.map((id) => {
        const item = catalog.find((c) => c.id === id);
        const label = item ? getDisplayLabel(item, lang) : id.replace(/^custom-/, '').replace(/-/g, ' ');
        return (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
            <Pressable onPress={() => onRemove(id)} hitSlop={8}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  addBtn: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    maxWidth: 120,
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addBtnText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'center',
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
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  category: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  noMatch: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
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
