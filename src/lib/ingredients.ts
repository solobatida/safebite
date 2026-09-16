import { SEED_INGREDIENTS } from '@/data/ingredients.seed';
import type { Ingredient, MatchedIngredient, UiLanguage } from '@/types';
import { getCustomIngredients } from '@/lib/storage';

let cache: Ingredient[] | null = null;
let searchIndex: { term: string; ingredientId: string }[] | null = null;

export function clearIngredientsCache(): void {
  cache = null;
  searchIndex = null;
}

export async function loadIngredients(): Promise<Ingredient[]> {
  if (cache) return cache;
  const custom = await getCustomIngredients();
  let remoteCustom: Ingredient[] = [];

  try {
    const { supabase, supabaseEnabled } = await import('@/lib/supabase');
    const { getSession } = await import('@/lib/storage');
    const session = await getSession();
    if (
      supabaseEnabled &&
      supabase &&
      session &&
      !session.isGuest &&
      !session.userId.startsWith('local-')
    ) {
      const { data } = await supabase
        .from('ingredients')
        .select('id,category,labels,aliases')
        .like('id', 'custom-%');
      remoteCustom = (data ?? []).map((row: any) => ({
        id: row.id as string,
        category: (row.category as Ingredient['category']) || 'other',
        labels: (row.labels ?? {}) as Ingredient['labels'],
        aliases: (row.aliases as string[] | undefined) ?? [],
      }));
    }
  } catch {
    // Offline / RLS — keep seed + local custom
  }

  const byId = new Map<string, Ingredient>();
  for (const ing of [...SEED_INGREDIENTS, ...custom, ...remoteCustom]) {
    byId.set(ing.id, ing);
  }
  cache = [...byId.values()];
  buildSearchIndex(cache);
  return cache;
}

function buildSearchIndex(ingredients: Ingredient[]): void {
  searchIndex = [];
  for (const ing of ingredients) {
    const terms = new Set<string>();
    for (const label of Object.values(ing.labels)) {
      if (label) terms.add(normalize(label));
    }
    for (const alias of ing.aliases ?? []) {
      terms.add(normalize(alias));
    }
    for (const term of terms) {
      if (term.length >= 2) searchIndex.push({ term, ingredientId: ing.id });
    }
  }
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Terms used only for suggestion search — active UI language label, never other languages. */
function suggestionTerms(ing: Ingredient, lang: UiLanguage): string[] {
  const label = ing.labels[lang]?.trim();
  if (!label) return [];
  const terms = [normalize(label)];
  for (const word of normalize(label).split(' ')) {
    if (word.length >= 2) terms.push(word);
  }
  return terms;
}

export async function searchIngredients(
  query: string,
  limit = 12,
  lang: UiLanguage = 'es'
): Promise<Ingredient[]> {
  const list = await loadIngredients();
  const q = normalize(query);

  // Suggestions only for ingredients with a label in the active UI language
  const withLang = list.filter((ing) => Boolean(ing.labels[lang]?.trim()));

  if (!q) return withLang.slice(0, limit);

  const scored = withLang
    .map((ing) => {
      const terms = suggestionTerms(ing, lang);
      if (terms.length === 0) return { ing, score: 0 };

      let score = 0;
      const full = terms[0];
      if (full.startsWith(q)) score = 100;
      else if (full.includes(q)) score = 50;
      else {
        for (const term of terms) {
          if (term.startsWith(q)) score = Math.max(score, 80);
          else if (term.includes(q)) score = Math.max(score, 35);
        }
      }
      return { ing, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.ing);
}

/** Label shown in the UI for the active language (no cross-language fallback for suggestions). */
export function getDisplayLabel(ing: Ingredient, lang: UiLanguage): string {
  const primary = ing.labels[lang]?.trim();
  if (primary) return primary;
  // Custom / incomplete rows only
  return ing.labels.en?.trim() || ing.id;
}

export function getAllTerms(ing: Ingredient): string[] {
  const terms = new Set<string>();
  for (const label of Object.values(ing.labels)) {
    if (label) terms.add(normalize(label));
  }
  for (const alias of ing.aliases ?? []) {
    terms.add(normalize(alias));
  }
  return [...terms];
}

export async function matchAvoidList(
  ingredientsText: string,
  avoidIds: string[],
  uiLang: UiLanguage,
  extra: { allergenTags?: string[]; ingredientTags?: string[] } = {}
): Promise<{ safe: boolean; matched: MatchedIngredient[]; unknown: string[] }> {
  const list = await loadIngredients();
  const avoidSet = new Set(avoidIds);
  const tagHaystack = normalize(
    [...(extra.allergenTags ?? []), ...(extra.ingredientTags ?? [])].join(' ')
  );
  const haystack = normalize([ingredientsText, tagHaystack].filter(Boolean).join(' '));
  const matched: MatchedIngredient[] = [];
  const matchedIds = new Set<string>();

  // Direct map from Open Food Facts allergen tags → catalog ids
  for (const tag of extra.allergenTags ?? []) {
    const id = OFF_ALLERGEN_TO_ID[tag.toLowerCase()];
    if (id && avoidSet.has(id) && !matchedIds.has(id)) {
      const ing = list.find((x) => x.id === id);
      if (ing) {
        matched.push({
          id,
          label: getDisplayLabel(ing, uiLang),
          matchedTerm: tag,
        });
        matchedIds.add(id);
      }
    }
  }

  for (const ing of list) {
    if (!avoidSet.has(ing.id) || matchedIds.has(ing.id)) continue;
    for (const term of getAllTerms(ing)) {
      if (term.length < 3) continue;
      if (containsTerm(haystack, term)) {
        matched.push({
          id: ing.id,
          label: getDisplayLabel(ing, uiLang),
          matchedTerm: term,
        });
        matchedIds.add(ing.id);
        break;
      }
    }
  }

  const unknown = findUnknownTokens(ingredientsText, list);
  return { safe: matched.length === 0, matched, unknown };
}

/** Open Food Facts allergen taxonomy → SafeBite ingredient ids */
const OFF_ALLERGEN_TO_ID: Record<string, string> = {
  'en:milk': 'milk',
  'en:dairy': 'milk',
  'en:lactose': 'lactose',
  'en:eggs': 'egg',
  'en:egg': 'egg',
  'en:gluten': 'wheat',
  'en:wheat': 'wheat',
  'en:peanuts': 'peanut',
  'en:peanut': 'peanut',
  'en:nuts': 'tree-nuts',
  'en:tree-nuts': 'tree-nuts',
  'en:almonds': 'almond',
  'en:hazelnuts': 'hazelnut',
  'en:walnuts': 'walnut',
  'en:cashew-nuts': 'cashew',
  'en:pistachio-nuts': 'pistachio',
  'en:macadamia-nuts': 'macadamia',
  'en:brazil-nuts': 'brazil-nut',
  'en:pecan-nuts': 'pecan',
  'en:soybeans': 'soy',
  'en:soy': 'soy',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sesame-seeds': 'sesame',
  'en:sesame': 'sesame',
  'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:sulfites': 'sulphites',
  'en:lupin': 'lupin',
  'en:fish': 'fish',
  'en:crustaceans': 'shrimp',
  'en:molluscs': 'shrimp',
};

function containsTerm(haystack: string, term: string): boolean {
  if (!term || !haystack) return false;
  if (haystack.includes(term)) return true;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\s,;(/])${escaped}([\\s,;.)/]|$)`, 'iu');
  return re.test(haystack);
}

function findUnknownTokens(text: string, catalog: Ingredient[]): string[] {
  const known = new Set<string>();
  for (const ing of catalog) {
    for (const t of getAllTerms(ing)) known.add(t);
  }
  const parts = text.split(/[,;()]/).map((p) => normalize(p)).filter((p) => p.length >= 4);
  const unknown: string[] = [];
  for (const part of parts.slice(0, 8)) {
    const hit = [...known].some((k) => part.includes(k) || k.includes(part));
    if (!hit && !unknown.includes(part)) unknown.push(part);
  }
  return unknown.slice(0, 3);
}

export async function addCustomIngredient(entry: Ingredient): Promise<void> {
  const { addCustomIngredient: save } = await import('@/lib/storage');
  await save(entry);
  cache = null;
  searchIndex = null;
}

const ALL_UI_LANGS: UiLanguage[] = ['en', 'it', 'fr', 'de', 'es', 'pt', 'ru', 'ar', 'ca'];

/** Build labels for every UI language (same display text until translated). */
export function labelsForAllLanguages(name: string): Ingredient['labels'] {
  const labels: Ingredient['labels'] = {};
  for (const code of ALL_UI_LANGS) {
    labels[code] = name;
  }
  return labels;
}

export function slugifyIngredientName(name: string): string {
  const ascii = normalize(name)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ascii.length >= 2 ? ascii : `x${Date.now().toString(36)}`;
}

/**
 * Create a custom ingredient in local catalog + Supabase ingredients (if logged in),
 * with the name copied to all UI languages.
 */
export async function createCustomIngredient(name: string): Promise<Ingredient> {
  const text = name.trim();
  if (text.length < 2) {
    throw new Error('Escribe al menos 2 caracteres.');
  }

  const slug = slugifyIngredientName(text);
  const entry: Ingredient = {
    id: `custom-${slug}`,
    category: 'other',
    labels: labelsForAllLanguages(text),
    aliases: [text],
  };

  const { addCustomIngredient: saveLocal, getSession } = await import('@/lib/storage');
  const { supabase, supabaseEnabled } = await import('@/lib/supabase');

  const session = await getSession();
  if (
    supabaseEnabled &&
    supabase &&
    session &&
    !session.isGuest &&
    !session.userId.startsWith('local-')
  ) {
    const { error } = await supabase.from('ingredients').upsert(
      {
        id: entry.id,
        category: entry.category,
        labels: entry.labels,
        aliases: entry.aliases ?? [],
        status: 'approved',
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  await saveLocal(entry);
  cache = null;
  searchIndex = null;
  return entry;
}
