import { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { searchIngredients, getDisplayLabel } from '@/lib/ingredients';
import type { Ingredient, UiLanguage } from '@/types';
import { colors, spacing } from '@/constants/theme';

export function IngredientSearch({
  lang,
  onSelect,
  placeholder,
}: {
  lang: UiLanguage;
  onSelect: (ing: Ingredient) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const results = await searchIngredients(query);
      if (!cancelled) setSuggestions(results);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {query.length > 0 && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              style={styles.suggestion}
              onPress={() => {
                onSelect(item);
                setQuery('');
                setSuggestions([]);
              }}
            >
              <Text style={styles.suggestionText}>{getDisplayLabel(item, lang)}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
    return <Text style={styles.empty}>Add ingredients you need to avoid.</Text>;
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
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  category: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
